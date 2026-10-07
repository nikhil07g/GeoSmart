
CREATE TYPE public.app_role AS ENUM ('citizen','admin','worker');
CREATE TYPE public.complaint_status AS ENUM ('PENDING','ASSIGNED','IN_PROGRESS','RESOLVED','REJECTED');
CREATE TYPE public.severity_level AS ENUM ('LOW','MEDIUM','HIGH','CRITICAL');
CREATE TYPE public.training_status AS ENUM ('NOT_STARTED','QUEUED','TRAINING','COMPLETED','FAILED');

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  name text NOT NULL DEFAULT 'Citizen',
  email text,
  phone text,
  address text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE TABLE public.workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  name text NOT NULL,
  email text,
  phone text,
  employee_id text NOT NULL UNIQUE,
  department text NOT NULL DEFAULT 'Sanitation',
  availability boolean NOT NULL DEFAULT true,
  current_lat double precision,
  current_lng double precision,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workers TO authenticated;
GRANT ALL ON public.workers TO service_role;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_code text NOT NULL UNIQUE DEFAULT ('GS-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  citizen_id uuid,
  citizen_name text NOT NULL DEFAULT 'Citizen',
  title text NOT NULL,
  description text,
  image_url text,
  extra_image_url text,
  resolution_image_url text,
  resolution_note text,
  admin_notes text,
  category text NOT NULL DEFAULT 'Mixed Waste',
  ai_category text,
  ai_confidence integer,
  ai_raw_class text,
  severity public.severity_level NOT NULL DEFAULT 'MEDIUM',
  severity_score integer NOT NULL DEFAULT 40,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  address text,
  status public.complaint_status NOT NULL DEFAULT 'PENDING',
  assigned_worker_id uuid REFERENCES public.workers(id) ON DELETE SET NULL,
  duplicate_of uuid REFERENCES public.complaints(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX complaints_geo_idx ON public.complaints (latitude, longitude);
CREATE INDEX complaints_status_idx ON public.complaints (status);
CREATE INDEX complaints_created_idx ON public.complaints (created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.complaints TO authenticated;
GRANT ALL ON public.complaints TO service_role;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.complaint_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  status public.complaint_status NOT NULL,
  changed_by uuid,
  changed_by_name text,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX complaint_history_complaint_idx ON public.complaint_history (complaint_id, created_at);
GRANT SELECT, INSERT ON public.complaint_history TO authenticated;
GRANT ALL ON public.complaint_history TO service_role;
ALTER TABLE public.complaint_history ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.hotspots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  complaint_count integer NOT NULL DEFAULT 0,
  severity_score integer NOT NULL DEFAULT 0,
  radius integer NOT NULL DEFAULT 300,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotspots TO authenticated;
GRANT ALL ON public.hotspots TO service_role;
ALTER TABLE public.hotspots ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  audience_role public.app_role,
  title text NOT NULL,
  message text,
  type text NOT NULL DEFAULT 'info',
  complaint_id uuid REFERENCES public.complaints(id) ON DELETE CASCADE,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON public.notifications (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.ai_datasets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  file_url text,
  file_type text,
  num_classes integer NOT NULL DEFAULT 0,
  num_images integer NOT NULL DEFAULT 0,
  status public.training_status NOT NULL DEFAULT 'NOT_STARTED',
  last_trained_at timestamptz,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_datasets TO authenticated;
GRANT ALL ON public.ai_datasets TO service_role;
ALTER TABLE public.ai_datasets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "workers readable" ON public.workers FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage workers" ON public.workers FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "worker updates own row" ON public.workers FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "complaints readable" ON public.complaints FOR SELECT TO authenticated USING (true);
CREATE POLICY "citizen creates own complaint" ON public.complaints FOR INSERT TO authenticated WITH CHECK (auth.uid() = citizen_id);
CREATE POLICY "admins manage complaints" ON public.complaints FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "assigned worker updates complaint" ON public.complaints FOR UPDATE TO authenticated
  USING (assigned_worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid()))
  WITH CHECK (assigned_worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid()));

CREATE POLICY "history readable" ON public.complaint_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "history insert by authenticated" ON public.complaint_history FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "hotspots readable" ON public.hotspots FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage hotspots" ON public.hotspots FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "read own notifications" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (audience_role IS NOT NULL AND public.has_role(auth.uid(), audience_role)));
CREATE POLICY "insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "datasets readable" ON public.ai_datasets FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage datasets" ON public.ai_datasets FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER workers_updated BEFORE UPDATE ON public.workers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER complaints_updated BEFORE UPDATE ON public.complaints FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE requested text;
BEGIN
  INSERT INTO public.profiles (user_id, name, email, phone, address)
  VALUES (NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'address')
  ON CONFLICT (user_id) DO NOTHING;

  requested := COALESCE(NEW.raw_user_meta_data->>'role','citizen');
  IF requested NOT IN ('citizen','admin','worker') THEN requested := 'citizen'; END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, requested::public.app_role)
  ON CONFLICT DO NOTHING;

  IF requested = 'worker' THEN
    INSERT INTO public.workers (user_id, name, email, employee_id)
    VALUES (NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
      NEW.email,
      'EMP-' || upper(substr(replace(NEW.id::text,'-',''),1,6)))
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.compute_severity_score(
  _category text, _confidence integer, _lat double precision, _lng double precision, _created timestamptz
) RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE base integer := 30; nearby integer := 0; age_days numeric := 0; score integer;
BEGIN
  base := CASE _category
    WHEN 'E-Waste' THEN 70
    WHEN 'Illegal Dumping' THEN 75
    WHEN 'Construction Waste' THEN 60
    WHEN 'Glass Waste' THEN 55
    WHEN 'Metal Waste' THEN 45
    WHEN 'Plastic Waste' THEN 50
    WHEN 'Organic Waste' THEN 45
    WHEN 'Mixed Waste' THEN 45
    WHEN 'Paper Waste' THEN 30
    ELSE 35 END;
  SELECT count(*) INTO nearby FROM public.complaints c
    WHERE c.status <> 'RESOLVED'
      AND abs(c.latitude - _lat) < 0.005 AND abs(c.longitude - _lng) < 0.005;
  age_days := GREATEST(0, EXTRACT(EPOCH FROM (now() - COALESCE(_created, now())))/86400);
  score := base
    + COALESCE(round((COALESCE(_confidence,60) - 60) * 0.25)::int, 0)
    + LEAST(20, nearby * 4)
    + LEAST(15, floor(age_days * 2)::int);
  RETURN GREATEST(0, LEAST(100, score));
END; $$;

CREATE OR REPLACE FUNCTION public.severity_from_score(_score integer)
RETURNS public.severity_level LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE WHEN _score >= 80 THEN 'CRITICAL'::public.severity_level
              WHEN _score >= 60 THEN 'HIGH'::public.severity_level
              WHEN _score >= 40 THEN 'MEDIUM'::public.severity_level
              ELSE 'LOW'::public.severity_level END;
$$;

CREATE OR REPLACE FUNCTION public.complaints_apply_severity()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s integer;
BEGIN
  s := public.compute_severity_score(NEW.category, NEW.ai_confidence, NEW.latitude, NEW.longitude, COALESCE(NEW.created_at, now()));
  NEW.severity_score := s;
  NEW.severity := public.severity_from_score(s);
  IF NEW.status = 'RESOLVED' AND NEW.resolved_at IS NULL THEN NEW.resolved_at := now(); END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER complaints_severity BEFORE INSERT OR UPDATE OF category, ai_confidence, status, latitude, longitude
ON public.complaints FOR EACH ROW EXECUTE FUNCTION public.complaints_apply_severity();

CREATE OR REPLACE FUNCTION public.complaints_lifecycle()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE wuser uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.complaint_history (complaint_id, status, changed_by, changed_by_name, comment)
    VALUES (NEW.id, NEW.status, NEW.citizen_id, NEW.citizen_name, 'Complaint submitted');
    INSERT INTO public.notifications (audience_role, title, message, type, complaint_id)
    VALUES ('admin', 'New complaint reported', NEW.title || ' — ' || COALESCE(NEW.address,'unknown location'),
      CASE WHEN NEW.severity IN ('HIGH','CRITICAL') THEN 'critical' ELSE 'info' END, NEW.id);
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.complaint_history (complaint_id, status, changed_by, changed_by_name, comment)
    VALUES (NEW.id, NEW.status, auth.uid(), NULL, 'Status changed to ' || NEW.status);
    IF NEW.citizen_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, complaint_id)
      VALUES (NEW.citizen_id, 'Complaint ' || NEW.complaint_code || ' is now ' || NEW.status, NEW.title, 'status', NEW.id);
    END IF;
  END IF;

  IF NEW.assigned_worker_id IS DISTINCT FROM OLD.assigned_worker_id AND NEW.assigned_worker_id IS NOT NULL THEN
    SELECT user_id INTO wuser FROM public.workers WHERE id = NEW.assigned_worker_id;
    IF wuser IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, complaint_id)
      VALUES (wuser, 'New task assigned', NEW.title || ' — ' || COALESCE(NEW.address,''), 'assignment', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER complaints_lifecycle_trg AFTER INSERT OR UPDATE ON public.complaints
FOR EACH ROW EXECUTE FUNCTION public.complaints_lifecycle();

ALTER TABLE public.complaints REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

CREATE POLICY "waste images read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'waste-images');
CREATE POLICY "waste images upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'waste-images');
CREATE POLICY "waste images update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'waste-images');

INSERT INTO public.workers (name, email, employee_id, department, availability, current_lat, current_lng) VALUES
 ('Ravi Kumar','ravi.kumar@geosmart.gov','EMP-1001','Sanitation Zone A', true, 17.4401, 78.3489),
 ('Anita Sharma','anita.sharma@geosmart.gov','EMP-1002','Sanitation Zone B', true, 17.3850, 78.4867),
 ('Imran Sheikh','imran.sheikh@geosmart.gov','EMP-1003','E-Waste Unit', true, 17.4239, 78.4738),
 ('Lakshmi Rao','lakshmi.rao@geosmart.gov','EMP-1004','Sanitation Zone C', false, 17.4065, 78.4772);

INSERT INTO public.complaints (citizen_name, title, description, image_url, category, ai_category, ai_confidence, ai_raw_class, latitude, longitude, address, status, created_at, assigned_worker_id) VALUES
('Priya Menon','Overflowing plastic bins near market','Bins have not been cleared for four days, plastic spilling onto the road.','https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800','Plastic Waste','Plastic Waste',94,'plastic',17.3850,78.4867,'Begum Bazaar Main Road, Hyderabad','PENDING', now() - interval '2 days', NULL),
('Arjun Reddy','Illegal dumping under flyover','Truckloads of mixed debris dumped overnight.','https://images.unsplash.com/photo-1590247813693-5541d1c609fd?w=800','Illegal Dumping','Illegal Dumping',88,'illegal_dumping',17.4401,78.3489,'Gachibowli Flyover, Hyderabad','ASSIGNED', now() - interval '4 days', (SELECT id FROM public.workers WHERE employee_id='EMP-1001')),
('Sneha Iyer','Discarded monitors and cables','Old CRT monitors dumped beside the park gate.','https://images.unsplash.com/photo-1610416953475-2b8a76d0a1d4?w=800','E-Waste','E-Waste',91,'e_waste',17.4239,78.4738,'Jubilee Hills Road No.36, Hyderabad','IN_PROGRESS', now() - interval '1 day', (SELECT id FROM public.workers WHERE employee_id='EMP-1003')),
('Mohan Das','Rotting organic waste at vegetable market','Strong smell, attracting stray animals.','https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=800','Organic Waste','Organic Waste',82,'organic',17.3616,78.4747,'Charminar Vegetable Market, Hyderabad','RESOLVED', now() - interval '9 days', (SELECT id FROM public.workers WHERE employee_id='EMP-1002')),
('Kavya Nair','Construction debris blocking footpath','Sand and broken bricks left after building work.','https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?w=800','Construction Waste','Construction Waste',77,'construction',17.4065,78.4772,'Banjara Hills Road No.12, Hyderabad','PENDING', now() - interval '6 hours', NULL),
('Rahul Verma','Broken glass near bus stop','Shattered bottles, risk to pedestrians.','https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800','Glass Waste','Glass Waste',85,'glass',17.4483,78.3915,'Hitech City Bus Stop, Hyderabad','ASSIGNED', now() - interval '3 days', (SELECT id FROM public.workers WHERE employee_id='EMP-1002')),
('Divya Prasad','Scrap metal pile on vacant plot','Rusted metal sheets accumulating for weeks.','https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=800','Metal Waste','Metal Waste',73,'metal',17.3730,78.4820,'Malakpet, Hyderabad','PENDING', now() - interval '11 days', NULL),
('Sameer Khan','Paper and cardboard littering lane','Shop cartons dumped in the service lane.','https://images.unsplash.com/photo-1595278069441-2cf29f8005a4?w=800','Paper Waste','Paper Waste',69,'paper',17.4126,78.4448,'Abids Service Lane, Hyderabad','RESOLVED', now() - interval '14 days', (SELECT id FROM public.workers WHERE employee_id='EMP-1001')),
('Neha Gupta','Mixed waste near lake bund','Household waste dumped on the lake bund.','https://images.unsplash.com/photo-1571727153934-b9e0059b7ab2?w=800','Mixed Waste','Mixed Waste',64,'mixed',17.4239,78.4520,'Hussain Sagar Lake Bund, Hyderabad','IN_PROGRESS', now() - interval '2 days', (SELECT id FROM public.workers WHERE employee_id='EMP-1004')),
('Vikram Singh','Plastic bottles choking drain','Storm drain blocked by plastic bottles.','https://images.unsplash.com/photo-1621451537084-482c73073a0f?w=800','Plastic Waste','Plastic Waste',96,'plastic',17.3860,78.4900,'Koti Main Road, Hyderabad','PENDING', now() - interval '20 hours', NULL);

INSERT INTO public.hotspots (name, latitude, longitude, complaint_count, severity_score, radius) VALUES
 ('Begum Bazaar cluster',17.3850,78.4867,25,87,400),
 ('Gachibowli corridor',17.4401,78.3489,17,72,500),
 ('Jubilee Hills',17.4239,78.4738,11,64,350),
 ('Charminar market',17.3616,78.4747,8,48,300),
 ('Hitech City',17.4483,78.3915,6,41,300);

INSERT INTO public.ai_datasets (name, description, file_type, num_classes, num_images, status, last_trained_at) VALUES
 ('waste-classification-v1','Baseline municipal waste image dataset','zip',10,12480,'COMPLETED', now() - interval '12 days'),
 ('street-dumping-augmented','Augmented illegal dumping samples','zip',3,3120,'NOT_STARTED', NULL);
