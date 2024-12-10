import { h, defineAsyncComponent, defineComponent, ref, onMounted } from 'vue'
import type { AsyncComponentLoader, Component } from 'vue'

type ComponentResolver = (component: Component) => void

export const defineVisibleComponent = ({
  componentLoader,
  loadingComponent,
  errorComponent,
  delay,
  timeout,
}: {
  componentLoader: AsyncComponentLoader
  loadingComponent?: Component
  errorComponent?: Component
  delay?: number
  timeout?: number
}) => {
  let resolveComponent: ComponentResolver

  return defineAsyncComponent({
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
          const component = await componentLoader()
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
          })

          // We observe the root of the
          // mounted loading component to detect
          // when it becomes visible
          observer.observe(elRef.value)
        })

        return () => {
          // Use provided loading component or default to a simple div
          const content = loadingComponent ? h(loadingComponent) : h('div', 'Loading...')

          return h('div', { ref: elRef }, content)
        }
      },
    }),
    // Delay before showing the loading component. Default: 200ms.
    delay,
    // A component to use if the load fails
    errorComponent,
    // The error component will be displayed if a timeout is
    // provided and exceeded. Default: Infinity.
    timeout,
  })
}
