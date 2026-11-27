import type { Cafe, CurrentUser, DraftContext, Product, VoiceIntent } from "../types";
import cafes from "./cafes.json";
import products from "./products.json";
import user from "./user.json";
import clean from "./intents/clean.json";
import ambiguousCafe from "./intents/ambiguous-cafe.json";
import unknownProduct from "./intents/unknown-product.json";
import datePhrase from "./intents/date-phrase.json";
import priceChange from "./intents/price-change.json";
import oddQuantity from "./intents/odd-quantity.json";
import noAccess from "./intents/no-access.json";

// All data here is made up. The sample "now" for most intents is Wednesday 25 November 2026, 10:30 in Sydney.
export const context: DraftContext = {
  cafes: cafes as Cafe[],
  products: products as Product[],
  user: user as CurrentUser,
};

export const intents: Record<string, VoiceIntent> = {
  clean: clean as VoiceIntent,
  "ambiguous-cafe": ambiguousCafe as VoiceIntent,
  "unknown-product": unknownProduct as VoiceIntent,
  "date-phrase": datePhrase as VoiceIntent,
  "price-change": priceChange as VoiceIntent,
  "odd-quantity": oddQuantity as VoiceIntent,
  "no-access": noAccess as VoiceIntent,
};
