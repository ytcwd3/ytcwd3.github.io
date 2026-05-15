delete from public.guestbook
where is_reply = true
  and name like '管理员%'
  and coalesce(admin_id, '') not in ('anyebojue', 'ytcwd3');
