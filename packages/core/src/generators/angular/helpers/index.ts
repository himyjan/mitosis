import { stripStateAndPropsRefs } from '@/helpers/strip-state-and-props-refs';
import { type MitosisComponent } from '@/types/mitosis-component';
import { MitosisNode } from '@/types/mitosis-node';

export const HELPER_FUNCTIONS = (
  isTs?: boolean,
): {
  [key: string]: string;
} => ({
  useObjectWrapper: `useObjectWrapper(...args${isTs ? ': any[]' : ''}) {
    let obj = {}
    args.forEach((arg) => {
      obj = { ...obj, ...arg };
    });
    return obj;
  }`,
  useObjectDotValues: `useObjectDotValues(obj${isTs ? ': any' : ''})${isTs ? ': any[]' : ''}) {
    return Object.values(obj);
  }`,
  useTypeOf: `useTypeOf(obj${isTs ? ': any' : ''})${isTs ? ': string' : ''}) {
    return typeof obj;
  }`,
  useJsonStringify: `useJsonStringify(...args${isTs ? ': any' : ''})${isTs ? ': string' : ''}) {
    return JSON.stringify(...args);
  }`,
  setAttributes: `setAttributes(el${isTs ? ': HTMLElement' : ''}, value${
    isTs ? ': any' : ''
  }, changes${isTs ? '?: any' : ''}) {
    if (!el) {
      return;
    }
    const target = typeof changes === 'undefined' ? value : changes;
    Object.keys(target).forEach((key) => {
      if (key.startsWith('on')) {
        if (this._listenerFns.has(key)) {
          this._listenerFns.get(key)${isTs ? '!' : ''}();
        }
        this._listenerFns.set(key, this.renderer.listen(
          el,
          key.replace('on', '').toLowerCase(),
          target[key]
        ));
      } else {
        this.renderer.setAttribute(el, key.toLowerCase(), target[key] ?? '');
      }
    });
  }`,
});

export const getAppropriateTemplateFunctionKeys = (code: string) =>
  Object.keys(HELPER_FUNCTIONS()).filter((key) => code.includes(key));

export const getDefaultProps = ({ defaultProps }: MitosisComponent) => {
  if (!defaultProps) return '';
  const defalutPropsString = Object.keys(defaultProps)
    .map((prop) => {
      const value = defaultProps!.hasOwnProperty(prop) ? defaultProps![prop]?.code : 'undefined';
      return `${prop}: ${value}`;
    })
    .join(',');
  return `const defaultProps = {${defalutPropsString}};\n`;
};

/**
 * if any state "property" is trying to access state.* or props.*
 * then we need to move them to onInit where they can be accessed
 * @param json The MitosisComponent.
 */
export const transformState = (json: MitosisComponent) => {
  Object.entries(json.state)
    .reverse()
    .forEach(([key, value]) => {
      if (value?.type === 'property') {
        if (value.code && (value.code.includes('state.') || value.code.includes('props.'))) {
          const code = stripStateAndPropsRefs(value.code, { replaceWith: 'this' });
          json.state[key]!.code = 'null';
          if (!json.hooks.onInit?.code) {
            json.hooks.onInit = { code: '' };
          }
          json.hooks.onInit.code = `\nthis.${key} = ${code};\n${json.hooks.onInit.code}`;
        }
      }
    });
};

/**
 * Checks if the first child has a "key" attribute - used for "For" elements
 * @param node The node which should be "For"
 */
export const hasFirstChildKeyAttribute = (node: MitosisNode): boolean => {
  if (!node.children || node.children.length === 0) {
    return false;
  }

  const firstChildBinding = node.children[0].bindings;
  return Boolean(firstChildBinding && firstChildBinding.key?.code);
};
