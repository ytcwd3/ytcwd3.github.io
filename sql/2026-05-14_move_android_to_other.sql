update public.games
set category = array['Ohter']
where subcategory = array['安卓']
  and (
    category = array['PC']
    or category = array['Other']
    or category = array['Ohter']
  );
