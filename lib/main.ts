import { h, defineAsyncComponent, defineComponent, ref, onMounted } from 'vue'
import type { AsyncComponentOptions, Component } from 'vue'

type ComponentResolver = (component: Component) => void

// Options with extended retry fields
interface Options extends Omit<AsyncComponentOptions, 'loader'> {
  maxRetries?: number
  retryDelay?: number
  observerOptions?: IntersectionObserverInit
}

type ComponentLoader = () => Promise<{ default: Component }>

export const defineInVueComponent = (loader: ComponentLoader, options: Options = {}) => {
  let resolveComponent: ComponentResolver
  const {
    maxRetries = 3,
    timeout = 30000,
    retryDelay = 1000,
    loadingComponent,
    observerOptions,
    ...restOptions
  } = options

  return defineAsyncComponent({
    // all options
    ...restOptions,

    // retry timeout
    timeout,

    // the loader function
    loader: () => {
      return new Promise((resolve) => {
        // We assign the resolve function to a variable
        // that we can call later inside the loadingComponent
        // when the component becomes visible
        resolveComponent = resolve as ComponentResolver
      })
    },
    // A component to use while the async component is loading
    loadingComponent: defineComponent({
      setup() {
        // We create a ref to the root element of
        // the loading component
        const elRef = ref()

        async function loadComponent() {
          // `resolveComponent()` receives the
          // the result of the dynamic `import()`
          // that is returned from `componentLoader()`
          const component = await loader()
          resolveComponent(component)
        }

        onMounted(async () => {
          // We immediately load the component if
          // IntersectionObserver is not supported
          if (!('IntersectionObserver' in window)) {
            await loadComponent()
            return
          }

          const observer = new IntersectionObserver(async (entries) => {
            if (!entries[0].isIntersecting) {
              return
            }

            // We cleanup the observer when the
            // component is not visible anymore
            observer.unobserve(elRef.value)
            await loadComponent()
          }, observerOptions)

          // We observe the root of the
          // mounted loading component to detect
          // when it becomes visible
          observer.observe(elRef.value)
        })

        return () => {
          // Use provided loading component or default to a simple div
          const content = loadingComponent ? h(loadingComponent) : h('div')

          return h('div', { ref: elRef }, content)
        }
      },
    }),
    onError(error, retry, fail, attempts) {
      // log attempt number and error
      console.warn(`Async component load attempt ${attempts} failed:`, error)

      // Fail if max retries exceeded
      if (attempts > maxRetries) {
        console.error('Max retries exceeded. Component load failed.')
        fail()
        return
      }

      // Exponential backoff with jitter
      const baseDelay = retryDelay * Math.pow(2, attempts - 1)
      // add randomness to retry delay
      const jitteredDelay = baseDelay * (1 + Math.random() * 0.5)

      // Schedule to call retry
      setTimeout(retry, jitteredDelay)
    },
  })
}
