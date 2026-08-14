/**
 * Names for the shapes the backend already defines.
 *
 * `schema.d.ts` is generated and deeply nested; importing `components["schemas"]["…"]`
 * at every call site would put the generator's naming into application code and
 * make a rename in the backend a find-and-replace here. These aliases are the
 * only place that knows the generated layout.
 */

import type { components, paths } from "./schema";

type Schemas = components["schemas"];

export type CarpetListItem = Schemas["CarpetListItem"];
export type CarpetDetail = Schemas["CarpetDetail"];
export type CarpetPage = Schemas["Page_CarpetListItem_"];
export type CatalogFacets = Schemas["CatalogFacets"];
export type VariantOut = Schemas["VariantOut"];
export type ImageOut = Schemas["ImageOut"];
export type SimilarItem = Schemas["SimilarItem"];
export type VisualSearchResponse = Schemas["VisualSearchResponse"];
export type SizeGuideResponse = Schemas["SizeGuideResponse"];
export type SizeSuggestion = Schemas["SizeSuggestion"];

export type CarpetPattern = Schemas["CarpetPattern"];
export type CarpetMaterial = Schemas["CarpetMaterial"];
export type RoomType = Schemas["RoomType"];
export type ColorFamily = Schemas["ColorFamily"];
export type ArAssetStatus = Schemas["ArAssetStatus"];

/**
 * The panel's own shapes.
 *
 * Named without the `Out` the generator carries over from Pydantic — inside the
 * interface there is no other direction for them to go.
 */
export type AdminStats = Schemas["AdminStats"];
export type AdminCarpetRow = Schemas["AdminCarpetRow"];
export type AdminCarpetDetail = Schemas["AdminCarpetDetail"];
export type AdminCarpetPage = Schemas["Page_AdminCarpetRow_"];
export type AdminOrder = Schemas["AdminOrderOut"];
export type ArVariantStatus = Schemas["ArVariantStatus"];
export type ArCornerSuggestion = Schemas["ArCornerSuggestion"];
export type CornerPoint = Schemas["CornerPoint"];
export type CarpetCreate = Schemas["CarpetCreate"];
export type CarpetUpdate = Schemas["CarpetUpdate"];
export type VariantCreate = Schemas["VariantCreate"];
export type VariantUpdate = Schemas["VariantUpdate"];

export type OrderCreate = Schemas["OrderCreate"];
export type OrderOut = Schemas["OrderOut"];
export type OrderStatus = Schemas["OrderStatus"];
export type OrderTrackRequest = Schemas["OrderTrackRequest"];

/**
 * The listing filters, taken from the query string of the endpoint rather than
 * from a schema: they reach FastAPI as query params, so no component is emitted
 * for them and this is where the contract actually lives.
 */
export type CarpetFilters = NonNullable<
  paths["/api/v1/carpets"]["get"]["parameters"]["query"]
>;

export type CarpetSort = NonNullable<CarpetFilters["sort"]>;

/**
 * Money arrives as a decimal string, not a number — the backend uses `Decimal`
 * and Pydantic serialises it faithfully rather than through a float. Keep it a
 * string until the moment it is formatted; parsing it early is what turns
 * ۲۴٫۸۰۰٫۰۰۰ into a rounding question.
 */
export type Money = string;
