# in-vue

A lightweight [Vue.js](https://vuex.vuejs.org/) tool that loads components when they enter the viewport.

it uses [IntersectionObserver](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver) to track when component comes into viewport

## Why Use in-vue?

- Reduce initial page load time by loading components only when they enter the viewport
- Prevent unnecessary component and asset loading for off-screen content
- **Ideal for**:
  - Long scrolling pages
  - Image-heavy websites
  - Complex dashboards
  - Single-page applications with multiple sections
  - Infinite scroll implementations
  - Dynamic content-heavy applications

## Features

- Lazy-load Vue components when they enter the viewport
- Retry mechanism for failed component loads
- Fallback loading component support
- Flexible IntersectionObserver configuration
- Exponential backoff with jitter for retries

## Installation

```bash
npm install in-vue
```

## Usage

```vue
<script setup lang="ts">
import { defineInVueComponent } from 'in-vue'

const InVueComponent = defineInVueComponent(() => import('./MyComponent'))
</script>

<template>
  <div>
    <InVueComponent />
  </div>
</template>
```

Load component 200px before entering viewport

```typescript
import { defineInVueComponent } from 'in-vue'

const InVueComponent = defineInVueComponent(() => import('./MyComponent'), {
  // Optional configuration
  observerOptions: {
    rootMargin: '0px 200px 0px 0px', // Load 200px before entering viewport
  },
})
```

## Props and Options

| Prop              | Type                       | Default     | Description                                        |
| ----------------- | -------------------------- | ----------- | -------------------------------------------------- |
| `maxRetries`      | `number`                   | `3`         | Maximum number of retry attempts to load component |
| `retryDelay`      | `number`                   | `1000`      | Initial delay between retries (ms)                 |
| `timeout`         | `number`                   | `30000`     | Maximum load timeout (ms)                          |
| `observerOptions` | `IntersectionObserverInit` | `undefined` | Customize IntersectionObserver behavior            |

### Additional Async Component Options

You can pass all standard [`defineAsyncComponent`](https://vuejs.org/api/general.html#defineasynccomponent) options:

- `delay`
- `errorComponent`
- `loadingComponent`
- `onError`
- And more...

## Heads Up!

- It's highly recommended to pass `loadingComponent` that has same width and height to have better user experience, otherwise it renders a simple `div` instead of `loadingComponent`.

- **SEO Caution**: Might not be ideal for pages that need strong search engine visibility
- **Minimum Vue Version**: Vue 3.2.25
- **Browser Support**: Requires IntersectionObserver
  - For older browsers, include a polyfill:
    ```bash
    npm install intersection-observer
    ```
  - Then import in your main entry file:
    ```typescript
    import 'intersection-observer'
    ```

## Inspiration

Inspired by [`react-in-viewport`](https://www.npmjs.com/package/react-in-viewport) for React ecosystem.
