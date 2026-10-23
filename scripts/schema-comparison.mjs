// Same-version pg_dump schema-only output; exclude migration_meta at capture.
export function normalizeSchema(input, projection = 'strict') {
  if (!['strict', 'application'].includes(projection)) throw new Error('Unknown schema projection');
  let sql = input.replaceAll('\r\n', '\n');
  if (projection === 'application') {
    sql = sql.replace(/--\n-- Name: DEFAULT PRIVILEGES FOR (?:SEQUENCES|TABLES); Type: DEFAULT ACL; Schema: public; Owner: cloud_admin\n--\n\nALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT [^;]+;\n\n\n/g, '');
  }
  return sql.replace(/^\\(?:un)?restrict .*\n/gm, '').replace(/^-- Dumped (?:from database|by pg_dump) version .*\n/gm, '').trim();
}
