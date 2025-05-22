export type CreditConsumption = {
  items: CreditConsumptionItem[];
  totalAmountInUSDCents: number;
};

export interface CreditConsumptionItem {
  totalAmountInUSDCents: number;
  consumptionType: CreditConsumptionType;
  consumptionUnit: number;
}

export enum CreditConsumptionType {
  TOOL_CALL = "TOOL_CALL",
  INPUT_TOKEN = "INPUT_TOKEN",
  OUTPUT_TOKEN = "OUTPUT_TOKEN",
}

export const ToolCallPriceInUSDCents = 1;
export const MillionInputTokensPriceInUSDCents = 600;
export const MillionOutputTokensPriceInUSDCents = 3000;



