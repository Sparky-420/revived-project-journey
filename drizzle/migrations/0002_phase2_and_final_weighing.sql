CREATE TABLE public.phase2_batches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 lot_number text NOT NULL UNIQUE,
 operator_id uuid NOT NULL DEFAULT auth.uid(),
 operator_name text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 status text NOT NULL DEFAULT 'processing',
 cured_weight_kg numeric NOT NULL,
 meat_weight_kg numeric NOT NULL,
 premix_weight_kg numeric NOT NULL,
 water_pct numeric NOT NULL,
 garlic_g numeric NOT NULL,
 guajillo_g numeric NOT NULL,
 paprika_g numeric NOT NULL,
 spices_g numeric NOT NULL,
 water_ml numeric NOT NULL,
 theoretical_weight_kg numeric NOT NULL,
 scale_weights_kg numeric[] NOT NULL DEFAULT '{}',
 finished_weight_kg numeric,
 yield_pct numeric,
 quality_name text,
 quality_notes text,
 closed_by uuid,
 closed_at timestamptz
);
GRANT SELECT ON public.phase2_batches TO authenticated;
GRANT ALL ON public.phase2_batches TO service_role;
ALTER TABLE public.phase2_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read phase2" ON public.phase2_batches FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE TABLE public.phase2_sources (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 phase2_batch_id uuid NOT NULL REFERENCES public.phase2_batches(id),
 bag_id uuid NOT NULL UNIQUE REFERENCES public.phase1_bags(id),
 bag_code text NOT NULL,
 source_lot text NOT NULL,
 reception_name text,
 cured_weight_kg numeric NOT NULL,
 meat_weight_kg numeric NOT NULL,
 entered_cold_room_at timestamptz NOT NULL
);
GRANT SELECT ON public.phase2_sources TO authenticated;
GRANT ALL ON public.phase2_sources TO service_role;
ALTER TABLE public.phase2_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read phase2 sources" ON public.phase2_sources FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE INDEX phase2_sources_batch_idx ON public.phase2_sources(phase2_batch_id);
CREATE FUNCTION public.start_phase2(p_bag_ids uuid[], p_water_pct numeric, p_operator_name text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b record; result_id uuid; total_cured numeric := 0; total_meat numeric := 0; amount integer; actor uuid := auth.uid();
BEGIN
 IF actor IS NULL OR NOT public.has_any_role(actor) THEN RAISE EXCEPTION 'Sin permiso'; END IF;
 IF p_water_pct IS NULL OR p_water_pct < 10 OR p_water_pct > 12 THEN RAISE EXCEPTION 'Agua fuera de rango'; END IF;
 IF NOT (public.has_role(actor, 'owner') OR public.has_role(actor, 'supervisor')) AND p_water_pct <> 10 THEN RAISE EXCEPTION 'Solo encargado ajusta agua'; END IF;
 IF p_operator_name IS NULL OR length(trim(p_operator_name)) = 0 OR length(p_operator_name) > 200 THEN RAISE EXCEPTION 'Responsable requerido'; END IF;
 amount := cardinality(p_bag_ids);
 IF amount IS NULL OR amount = 0 OR amount > 500 OR amount <> (SELECT count(DISTINCT x) FROM unnest(p_bag_ids) x) THEN RAISE EXCEPTION 'Seleccion invalida'; END IF;
 PERFORM id FROM public.phase1_bags WHERE id = ANY(p_bag_ids) ORDER BY id FOR UPDATE;
 IF (SELECT count(*) FROM public.phase1_bags WHERE id = ANY(p_bag_ids)) <> amount THEN RAISE EXCEPTION 'Bolsa inexistente'; END IF;
 FOR b IN SELECT bag.*, batch.clean_weight_kg, batch.premix_total_g FROM public.phase1_bags bag JOIN public.phase1_batches batch ON batch.id = bag.batch_id WHERE bag.id = ANY(p_bag_ids) LOOP
  IF b.status NOT IN ('resting', 'in_cold_room') OR EXISTS(SELECT 1 FROM public.phase2_sources WHERE bag_id=b.id) THEN RAISE EXCEPTION 'Bolsa ya retirada'; END IF;
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
 UPDATE public.phase1_bags SET status='in_phase2' WHERE id=ANY(p_bag_ids);
 RETURN result_id;
END $$;
REVOKE ALL ON FUNCTION public.start_phase2(uuid[],numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_phase2(uuid[],numeric,text) TO authenticated;
CREATE FUNCTION public.phase2_scale(p_batch_id uuid, p_weight numeric DEFAULT NULL, p_remove_index integer DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE batch public.phase2_batches; actor uuid := auth.uid();
BEGIN
 IF actor IS NULL OR NOT public.has_any_role(actor) THEN RAISE EXCEPTION 'Sin permiso'; END IF;
 SELECT * INTO batch FROM public.phase2_batches WHERE id=p_batch_id FOR UPDATE;
 IF NOT FOUND OR batch.status <> 'processing' THEN RAISE EXCEPTION 'Lote no abierto'; END IF;
 IF p_remove_index IS NOT NULL THEN
  IF p_weight IS NOT NULL OR p_remove_index < 1 OR p_remove_index > cardinality(batch.scale_weights_kg) THEN RAISE EXCEPTION 'Registro invalido'; END IF;
  UPDATE public.phase2_batches SET scale_weights_kg=COALESCE((SELECT array_agg(v ORDER BY ord) FROM unnest(batch.scale_weights_kg) WITH ORDINALITY AS t(v,ord) WHERE ord <> p_remove_index), '{}'::numeric[]) WHERE id=p_batch_id;
 ELSE
  IF p_weight IS NULL OR p_weight <= 0 OR p_weight::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Peso invalido'; END IF;
  UPDATE public.phase2_batches SET scale_weights_kg=array_append(scale_weights_kg,p_weight) WHERE id=p_batch_id;
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.phase2_scale(uuid,numeric,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.phase2_scale(uuid,numeric,integer) TO authenticated;
CREATE FUNCTION public.close_phase2(p_batch_id uuid, p_quality_name text, p_notes text DEFAULT '') RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE batch public.phase2_batches; total numeric; actor uuid := auth.uid();
BEGIN
 IF actor IS NULL OR NOT public.has_any_role(actor) THEN RAISE EXCEPTION 'Sin permiso'; END IF;
 IF p_quality_name IS NULL OR length(trim(p_quality_name))=0 OR length(p_quality_name)>200 OR length(p_notes)>2000 THEN RAISE EXCEPTION 'Responsable requerido'; END IF;
 SELECT * INTO batch FROM public.phase2_batches WHERE id=p_batch_id FOR UPDATE;
 IF NOT FOUND OR batch.status <> 'processing' THEN RAISE EXCEPTION 'Lote no abierto'; END IF;
 SELECT sum(w) INTO total FROM unnest(batch.scale_weights_kg) w;
 IF total IS NULL OR total <= 0 THEN RAISE EXCEPTION 'Falta pesaje final'; END IF;
 UPDATE public.phase2_batches SET status='completed', finished_weight_kg=total, yield_pct=total/meat_weight_kg*100, quality_name=trim(p_quality_name), quality_notes=p_notes, closed_by=actor, closed_at=now() WHERE id=p_batch_id;
END $$;
REVOKE ALL ON FUNCTION public.close_phase2(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_phase2(uuid,text,text) TO authenticated;