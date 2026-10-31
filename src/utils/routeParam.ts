/**
 * A route param that can never name a record: empty, an unfilled route
 * placeholder (`:id`), or text with characters no record id contains.
 * Detail pages show their not-found state for these without calling the API,
 * so a mistyped or template link never produces a 400/404 request.
 */
const ROUTE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/;

export function isMalformedRouteParam(value: string | null | undefined): boolean {
    return !value || !ROUTE_ID_RE.test(value);
}
