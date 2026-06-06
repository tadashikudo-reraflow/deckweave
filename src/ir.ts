export type SlideSize = {
  widthPx: number;
  heightPx: number;
};

export type Fill =
  | { type: "color"; color: string }
  | { type: "image"; dataUri: string };

export type BaseElement = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation?: number;
};

export type TextElement = BaseElement & {
  type: "text";
  text: string;
  fontSize?: number;
  fontFace?: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  fill?: Fill;
};

export type ImageElement = BaseElement & {
  type: "image";
  dataUri: string;
  contentType: string;
};

export type DashStyle =
  | "solid"
  | "dash"
  | "dashDot"
  | "lgDash"
  | "lgDashDot"
  | "sysDash"
  | "sysDot";

export type ShapeElement = BaseElement & {
  type: "shape";
  shape: "rect" | "roundRect" | "line";
  /** Corner radius in pixels (only used when shape === "roundRect"). */
  radius?: number;
  fill?: Fill;
  line?: { color?: string; width?: number; dash?: DashStyle };
};

export type ChartType = "bar" | "barH" | "line" | "pie" | "doughnut" | "area";

export type ChartSeries = {
  name: string;
  labels?: string[];
  values: number[];
};

export type ChartElement = BaseElement & {
  type: "chart";
  chartType: ChartType;
  title?: string;
  series: ChartSeries[];
  colors?: string[];
  showLegend?: boolean;
  showValues?: boolean;
};

export type SlideElement = TextElement | ImageElement | ShapeElement | ChartElement;

export type SlideIR = {
  id: string;
  size: SlideSize;
  background?: Fill;
  elements: SlideElement[];
};

export type DeckIR = {
  source?: string;
  size: SlideSize;
  slides: SlideIR[];
};
