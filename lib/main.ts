import { defineAsyncComponent, h, defineComponent, ref, onMounted, version } from 'vue'
import type { Component, DefineComponent, AsyncComponentOptions } from 'vue'

// Type for loader / import() function
type ComponentLoader = () => Promise<{ default: Component }>

// Enhanced options interface
interface EnhancedAsyncComponentOptions extends Omit<AsyncComponentOptions, 'loader'> {
  // Retry-related options
  maxRetries?: number
  retryDelay?: number

  // Viewport loading options
  observerOptions?: IntersectionObserverInit
  loadingComponent?: Component
}

// Check Vue compatibility (optional, but carried over from original implementation)
function isCompatibleVueVersion() {
  const [major, minor] = version.split('.').map(Number)
  return major === 3 && minor >= 2
}

function defineInVueComponent(
  loader: ComponentLoader,
  options: EnhancedAsyncComponentOptions = {},
): DefineComponent {
  // Throw error if Vue version is incompatible
  if (!isCompatibleVueVersion()) {
    throw new Error('Incompatible Vue Version: Minimum compatible vue version is 3.2.0')
  }

  // Destructure with default values
  const {
    maxRetries = 3,
    timeout = 30000,
    retryDelay = 1000,
    observerOptions = {},
    loadingComponent,
    ...restOptions
  } = options

  // If IntersectionObserver is not supported, fallback to standard async component
  if (!('IntersectionObserver' in window)) {
    return defineAsyncComponent({
      ...restOptions,

      loader,
      timeout,
      onError(error, retry, fail, attempts) {
        console.warn(`Async component load attempt ${attempts} failed:`, error)

        if (attempts > maxRetries) {
          console.error('Max retries exceeded. Component load failed.')
          fail()
          return
        }

        const baseDelay = retryDelay * Math.pow(2, attempts - 1)
        const jitteredDelay = baseDelay * (1 + Math.random() * 0.5)

        setTimeout(retry, jitteredDelay)
      },
    }) as DefineComponent
  }

  // Viewport-aware async component
  return defineAsyncComponent({
    ...restOptions,
    loader: () => {
      return new Promise((resolve) => {
        // eslint-disable-next-line prefer-const
        let resolveComponent: (component: { default: Component }) => void

        const loadingComponentWrapper = defineComponent({
          setup() {
            const elRef = ref<HTMLElement>()

            async function loadComponent() {
              try {
                const component = await loader()
                resolveComponent(component)
              } catch (error) {
                console.error('Component loading failed', error)
              }
            }

            onMounted(async () => {
              const observer = new IntersectionObserver(async (entries) => {
                if (!entries[0].isIntersecting) return

                // Unobserve to prevent multiple loads
                observer.unobserve(elRef.value!)

                await loadComponent()
              }, observerOptions)

              // Observe the root element
              observer.observe(elRef.value!)
            })

            return () => {
              const content = loadingComponent ? h(loadingComponent) : h('div', 'Loading...')

              return h('div', { ref: elRef }, content)
            }
          },
        })

        // Assign the resolve function to be used in the loading component
        resolveComponent = resolve as (component: { default: Component }) => void

        return h(loadingComponentWrapper)
      })
    },
    timeout,
    onError(error, retry, fail, attempts) {
      console.warn(`Async component load attempt ${attempts} failed:`, error)

      if (attempts > maxRetries) {
        console.error('Max retries exceeded. Component load failed.')
        fail()
        return
      }

      const baseDelay = retryDelay * Math.pow(2, attempts - 1)
      const jitteredDelay = baseDelay * (1 + Math.random() * 0.5)

      setTimeout(retry, jitteredDelay)
    },
  }) as DefineComponent
}

export { defineInVueComponent }
