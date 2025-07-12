import React from "react";

interface ProvidersWithArguments {
  component: React.ComponentType<any>;
  props: Record<string, any>;
}

export const providerWrapper = (
  ...args: Array<React.ComponentType<any> | Record<string, any>>
) => {
  const providersWithArguments: ProvidersWithArguments[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i] as React.ComponentType<any>;
    const props = args[i + 1] as Record<string, any>;

    if (typeof arg !== 'function' && typeof arg !== 'object') {
      throw new Error('Invalid argument');
    }

    if (typeof arg === 'function') {
      if (typeof props !== 'object') {
        providersWithArguments.push({ component: arg, props: {} });
      } else {
        providersWithArguments.unshift({ component: arg, props });
      }
    }
  }

  const firstElement = providersWithArguments.shift();

  // Wrap with each provider from right to left
  return providersWithArguments.reduceRight((acc, el) => {
    return <el.component {...el.props}>{acc}</el.component>;
  }, <firstElement.component {...firstElement.props} />);
};
