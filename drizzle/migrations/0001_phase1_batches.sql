CREATE TABLE public.phase1_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_number text NOT NULL UNIQUE,
  gross_weight_kg numeric NOT NULL CHECK (gross_weight_kg > 0),
  waste_weight_kg numeric NOT NULL DEFAULT 0 CHECK (waste_weight_kg >= 0),
  clean_weight_kg numeric NOT NULL DEFAULT 0,
  premix_dose_g_per_kg numeric NOT NULL CHECK (premix_dose_g_per_kg BETWEEN 12 AND 15),
  premix_total_g numeric NOT NULL DEFAULT 0,
  premix_salt_g numeric NOT NULL DEFAULT 0,
  premix_cure_salt_g numeric NOT NULL DEFAULT 0,
  premix_sugar_g numeric NOT NULL DEFAULT 0,
  operator_id uuid NOT NULL DEFAULT auth.uid(),
  operator_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (waste_weight_kg < gross_weight_kg)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.phase1_batches TO authenticated;
GRANT ALL ON public.phase1_batches TO service_role;
ALTER TABLE public.phase1_batches ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.phase1_bags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.phase1_batches(id) ON DELETE CASCADE,
  bag_code text NOT NULL UNIQUE,
  target_weight_kg numeric NOT NULL,
  actual_weight_kg numeric NOT NULL CHECK (actual_weight_kg > 0),
  entered_cold_room_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'resting' CHECK (status IN ('resting','ready','used')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.phase1_bags TO authenticated;
GRANT ALL ON public.phase1_bags TO service_role;
ALTER TABLE public.phase1_bags ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id) $$;

-- Server-side formula: clean meat and premix 85/9/6 are always recomputed, so nobody can alter them.
CREATE OR REPLACE FUNCTION public.phase1_compute()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.clean_weight_kg := NEW.gross_weight_kg - NEW.waste_weight_kg;
  NEW.premix_total_g := NEW.clean_weight_kg * NEW.premix_dose_g_per_kg;
  NEW.premix_salt_g := NEW.premix_total_g * 0.85;
  NEW.premix_cure_salt_g := NEW.premix_total_g * 0.09;
  NEW.premix_sugar_g := NEW.premix_total_g * 0.06;
  IF TG_OP = 'INSERT' THEN NEW.operator_id := auth.uid(); END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER phase1_compute_trg BEFORE INSERT OR UPDATE ON public.phase1_batches
  FOR EACH ROW EXECUTE FUNCTION public.phase1_compute();

CREATE POLICY "Staff read batches" ON public.phase1_batches FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid()));
CREATE POLICY "Staff create batches" ON public.phase1_batches FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid()));
CREATE POLICY "Managers edit batches" ON public.phase1_batches FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'supervisor'));
CREATE POLICY "Owner deletes batches" ON public.phase1_batches FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'owner'));

CREATE POLICY "Staff read bags" ON public.phase1_bags FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid()));
CREATE POLICY "Staff create bags" ON public.phase1_bags FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.phase1_batches b WHERE b.id = batch_id
      AND (b.operator_id = auth.uid() OR public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'supervisor'))));
CREATE POLICY "Staff update bags" ON public.phase1_bags FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid()));
CREATE POLICY "Owner deletes bags" ON public.phase1_bags FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'owner'));