/** Overpass transport shared by the import and diagnostic scripts. */
export async function requestOverpass(
  query: string,
  method: "GET" | "POST" = "GET",
  endpoint = "https://overpass-api.de/api/interpreter"
) {
  const url = new URL(endpoint);
  if (method === "GET") url.searchParams.set("data", query);
  const response = await fetch(url, {
    method,
    ...(method === "POST"
      ? { headers: { "Content-Type": "text/plain" }, body: query }
      : {}),
  });
  // Axios parsed JSON when possible and otherwise returned the response text.
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text; // Overpass can also return diagnostic text.
  }
  if (!response.ok) {
    throw Object.assign(
      new Error(`Request failed with status code ${response.status}`),
      { response: { status: response.status, data } }
    );
  }
  return { status: response.status, data };
}
