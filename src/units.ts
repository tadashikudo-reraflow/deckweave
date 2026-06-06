export const EMU_PER_INCH = 914400;
export const CSS_PX_PER_INCH = 96;

export function emuToPx(value: number | string | undefined): number {
  if (value == null || value === "") return 0;
  return Number(value) / (EMU_PER_INCH / CSS_PX_PER_INCH);
}

export function pxToIn(value: number): number {
  return value / CSS_PX_PER_INCH;
}

export function ptToPx(value: number): number {
  return (value / 72) * CSS_PX_PER_INCH;
}

export function pxToPt(value: number): number {
  return (value / CSS_PX_PER_INCH) * 72;
}

export function pptFontSizeToPt(value: number | string | undefined): number | undefined {
  if (value == null || value === "") return undefined;
  return Number(value) / 100;
}
