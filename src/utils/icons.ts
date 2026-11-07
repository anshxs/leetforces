import { createElement as createLucideElement } from 'lucide';

export interface RenderLucideOptions {
  size?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  className?: string;
}

export function renderLucide(
  iconNode: any,
  options: RenderLucideOptions = {}
): SVGElement {
  const size = options.size || 15;
  return createLucideElement(iconNode, {
    width: size,
    height: size,
    'stroke-width': options.strokeWidth || 2,
    stroke: options.stroke || 'currentColor',
    fill: options.fill || 'none',
    class: `lc-lucide-icon ${options.className || ''}`.trim(),
  });
}

