export function withPara(href: string, para?: string | null) {
  const url = new URL(href, "https://local.invalid");
  if (para && para !== "ambos") url.searchParams.set("para", para);
  else url.searchParams.delete("para");
  return url.pathname + url.search;
}
