
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.complaints_apply_severity() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.complaints_lifecycle() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.compute_severity_score(text,integer,double precision,double precision,timestamptz) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.severity_from_score(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
