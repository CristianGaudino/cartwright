import demoCars from "./demo-cars.json";
import { createFileProvider } from "./file-provider";
import type { Car, StockProvider } from "./types";

// The one place that names a concrete provider (D-06).
export const stock: StockProvider = createFileProvider(demoCars as Car[]);
