CREATE OR REPLACE FUNCTION public.start_phase2(p_bag_ids uuid[], p_water_pct numeric, p_operator_name text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b record; result_id uuid; total_cured numeric := 0; total_meat numeric := 0; amount integer; actor uuid := auth.uid();
BEGIN
 IF actor IS NULL OR NOT public.has_any_role(actor) THEN RAISE EXCEPTION 'Sin permiso'; END IF;
 IF p_water_pct IS NULL OR p_water_pct::text IN ('NaN','Infinity','-Infinity') OR p_water_pct < 10 OR p_water_pct > 12 THEN RAISE EXCEPTION 'Agua fuera de rango'; END IF;
 IF NOT (public.has_role(actor, 'owner') OR public.has_role(actor, 'supervisor')) AND p_water_pct <> 10 THEN RAISE EXCEPTION 'Solo encargado ajusta agua'; END IF;
 IF p_operator_name IS NULL OR length(trim(p_operator_name)) = 0 OR length(p_operator_name) > 200 THEN RAISE EXCEPTION 'Responsable requerido'; END IF;
 amount := cardinality(p_bag_ids);
 IF amount IS NULL OR amount = 0 OR amount > 500 OR amount <> (SELECT count(DISTINCT x) FROM unnest(p_bag_ids) x) THEN RAISE EXCEPTION 'Seleccion invalida'; END IF;
 PERFORM id FROM public.phase1_bags WHERE id = ANY(p_bag_ids) ORDER BY id FOR UPDATE;
 IF (SELECT count(*) FROM public.phase1_bags WHERE id = ANY(p_bag_ids)) <> amount THEN RAISE EXCEPTION 'Bolsa inexistente'; END IF;
 FOR b IN SELECT bag.*, batch.clean_weight_kg, batch.premix_total_g FROM public.phase1_bags bag JOIN public.phase1_batches batch ON batch.id = bag.batch_id WHERE bag.id = ANY(p_bag_ids) LOOP
  IF b.status NOT IN ('resting', 'in_cold_room', 'ready') OR EXISTS(SELECT 1 FROM public.phase2_sources WHERE bag_id=b.id) THEN RAISE EXCEPTION 'Bolsa ya retirada'; END IF;
  IF b.entered_cold_room_at > now() - interval '24 hours' THEN RAISE EXCEPTION 'Bolsa aun en reposo'; END IF;
  IF b.actual_weight_kg <= 0 OR b.clean_weight_kg <= 0 THEN RAISE EXCEPTION 'Peso invalido'; END IF;
  total_cured := total_cured + b.actual_weight_kg;
  total_meat := total_meat + b.actual_weight_kg * b.clean_weight_kg / (b.clean_weight_kg + b.premix_total_g / 1000);
 END LOOP;
 result_id := gen_random_uuid();
 INSERT INTO public.phase2_batches(id, lot_number, operator_id, operator_name, cured_weight_kg, meat_weight_kg, premix_weight_kg, water_pct, garlic_g, guajillo_g, paprika_g, spices_g, water_ml, theoretical_weight_kg)
 VALUES (result_id, 'F2-' || to_char(now(), 'YYYYMMDD-HH24MI') || '-' || left(result_id::text,8), actor, trim(p_operator_name), total_cured, total_meat, total_cured-total_meat, p_water_pct, total_meat*6, total_meat*15, total_meat*4, total_meat*6, total_meat*p_water_pct*10, total_cured+total_meat*(3.1+p_water_pct)/100);
 INSERT INTO public.phase2_sources(phase2_batch_id, bag_id, bag_code, source_lot, reception_name, cured_weight_kg, meat_weight_kg, entered_cold_room_at)
 SELECT result_id, bag.id, bag.bag_code, batch.lot_number, batch.operator_name, bag.actual_weight_kg, bag.actual_weight_kg*batch.clean_weight_kg/(batch.clean_weight_kg+batch.premix_total_g/1000), bag.entered_cold_room_at FROM public.phase1_bags bag JOIN public.phase1_batches batch ON batch.id=bag.batch_id WHERE bag.id=ANY(p_bag_ids);
 UPDATE public.phase1_bags SET status='used' WHERE id=ANY(p_bag_ids);
 RETURN result_id;
END $$;
REVOKE ALL ON FUNCTION public.start_phase2(uuid[],numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_phase2(uuid[],numeric,text) TO authenticated;