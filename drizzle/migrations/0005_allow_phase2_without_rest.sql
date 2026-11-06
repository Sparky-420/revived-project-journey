CREATE OR REPLACE FUNCTION public.start_phase2_lots(p_items jsonb, p_water_pct numeric, p_operator_name text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE it record; b record; result_id uuid := gen_random_uuid(); total_cured numeric := 0; total_meat numeric := 0; meat numeric; actor uuid := auth.uid();
BEGIN
 IF actor IS NULL OR NOT public.has_any_role(actor) THEN RAISE EXCEPTION 'Sin permiso'; END IF;
 IF p_water_pct IS NULL OR p_water_pct::text IN ('NaN','Infinity','-Infinity') OR p_water_pct < 10 OR p_water_pct > 12 THEN RAISE EXCEPTION 'Agua fuera de rango'; END IF;
 IF NOT (public.has_role(actor,'owner') OR public.has_role(actor,'supervisor')) AND p_water_pct <> 10 THEN RAISE EXCEPTION 'Solo encargado ajusta agua'; END IF;
 IF p_operator_name IS NULL OR length(trim(p_operator_name)) = 0 OR length(p_operator_name) > 200 THEN RAISE EXCEPTION 'Responsable requerido'; END IF;
 IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 100 THEN RAISE EXCEPTION 'Seleccion invalida'; END IF;
 IF (SELECT count(DISTINCT e->>'batch_id') FROM jsonb_array_elements(p_items) e) <> jsonb_array_length(p_items) THEN RAISE EXCEPTION 'Lote repetido'; END IF;
 INSERT INTO public.phase2_batches(id, lot_number, operator_id, operator_name, cured_weight_kg, meat_weight_kg, premix_weight_kg, water_pct, garlic_g, guajillo_g, paprika_g, spices_g, water_ml, theoretical_weight_kg)
 VALUES (result_id, 'F2-' || to_char(now(),'YYYYMMDD-HH24MI') || '-' || left(result_id::text,8), actor, trim(p_operator_name), 0,0,0,p_water_pct,0,0,0,0,0,0);
 FOR it IN SELECT (e->>'batch_id')::uuid AS batch_id, (e->>'kg')::numeric AS kg FROM jsonb_array_elements(p_items) e ORDER BY 1 LOOP
  SELECT * INTO b FROM public.phase1_batches WHERE id = it.batch_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lote inexistente'; END IF;
  IF it.kg IS NULL OR it.kg::text IN ('NaN','Infinity') OR it.kg <= 0 OR it.kg > b.available_kg + 0.0005 THEN RAISE EXCEPTION 'Kilos fuera del disponible'; END IF;
  IF b.cured_weight_kg <= 0 THEN RAISE EXCEPTION 'Peso invalido'; END IF;
  meat := it.kg * b.clean_weight_kg / b.cured_weight_kg;
  total_cured := total_cured + it.kg; total_meat := total_meat + meat;
  UPDATE public.phase1_batches SET available_kg = greatest(0, available_kg - it.kg) WHERE id = b.id;
  INSERT INTO public.phase2_lot_sources(phase2_batch_id, phase1_batch_id, source_lot, reception_name, cured_weight_kg, meat_weight_kg, entered_cold_room_at)
  VALUES (result_id, b.id, b.lot_number, b.operator_name, it.kg, meat, b.entered_cold_room_at);
 END LOOP;
 UPDATE public.phase2_batches SET cured_weight_kg=total_cured, meat_weight_kg=total_meat, premix_weight_kg=total_cured-total_meat,
  garlic_g=total_meat*6, guajillo_g=total_meat*15, paprika_g=total_meat*4, spices_g=total_meat*6, water_ml=total_meat*p_water_pct*10,
  theoretical_weight_kg=total_cured+total_meat*(3.1+p_water_pct)/100 WHERE id=result_id;
 RETURN result_id;
END $$;
REVOKE ALL ON FUNCTION public.start_phase2_lots(jsonb,numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_phase2_lots(jsonb,numeric,text) TO authenticated;