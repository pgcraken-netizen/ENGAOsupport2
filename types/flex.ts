// LINE Flex Message types (simplified)
export interface FlexMessage {
  type: 'flex';
  altText: string;
  contents: FlexContainer;
}

export interface FlexContainer {
  type: 'bubble' | 'carousel';
  size?: 'nano' | 'micro' | 'kilo' | 'mega' | 'giga';
  header?: FlexBox;
  body?: FlexBox;
  footer?: FlexBox;
}

export interface FlexBox {
  type: 'box';
  layout: 'vertical' | 'horizontal' | 'baseline';
  contents: FlexComponent[];
  spacing?: string;
  paddingAll?: string;
  backgroundColor?: string;
  cornerRadius?: string;
  flex?: number;
  wrap?: boolean;
  margin?: string;
}

export type FlexComponent = FlexBox | FlexText | FlexButton | FlexSpacer | FlexImage;

export interface FlexText {
  type: 'text';
  text: string;
  size?: string;
  color?: string;
  weight?: 'regular' | 'bold';
  align?: 'start' | 'center' | 'end';
  wrap?: boolean;
  flex?: number;
  margin?: string;
}

export interface FlexButton {
  type: 'button';
  action: PostbackAction | URIAction;
  style?: 'primary' | 'secondary' | 'link';
  color?: string;
  height?: 'sm' | 'md';
  flex?: number;
  margin?: string;
}

export interface PostbackAction {
  type: 'postback';
  label: string;
  data: string;
  displayText?: string;
}

export interface URIAction {
  type: 'uri';
  label: string;
  uri: string;
}

export interface FlexSpacer {
  type: 'spacer';
  size?: string;
}

export interface FlexImage {
  type: 'image';
  url: string;
  size?: string;
  aspectRatio?: string;
}
