import { frag, iter, raf, shallowEqual } from './utils'

export interface IObj extends Object {
  [key: string]: any
}

export interface INYXT extends HTMLElement {
  __nyxt__: Impl
}

interface IEventGroup {
  type: string
  events: IEvent[]
}

interface IEvent {
  selector: string
  handle: (this: any) => (a?: IProps) => any
}

interface IFrag {
  $frag: DocumentFragment
  adjSelector: string
  assert: (a: IObj, b?: IObj) => Promise<{}>
}

interface IPropVar {
  prop: string
  selector: string
}

interface IProps {
  [index: string]: IObj
  current: IObj
  next: IObj
  previous: IObj
}

interface Impl {
  isMounted: number
  props?: IProps

  didMount: (...a: IObj[]) => void

  shouldUpdate: () => Promise<{}>
  interceptors: Array<(a?: IObj, b?: IObj) => boolean | void>
  didUpdate: () => void

  destroyers: Array<(a?: IObj, b?: IObj) => boolean | void>
  unmount: () => void
  willUnmount: () => Promise<{}>

  $events: IEventGroup[]
  _addEvents: () => void

  $frags: IFrag[]
  _parseFrags: () => void

  $vars: IPropVar[]
  _parseVariables: () => void
}

// ------------------------------------------------------

const component = (el: HTMLElement): Impl => ({
  isMounted: 0,

  didMount() {
    this.isMounted = 1
    iter([this._addEvents, this._parseVariables], (fn: () => void) => fn.call(this))
  },

  interceptors: [(a, b) => !shallowEqual(a, b)],
  shouldUpdate() {
    const { current = {}, next = {} } = this.props || {}
    return Promise.all(this.interceptors.map(fn => new Promise((y, n) => (fn(current, next) ? y() : n()))))
      .then(() => new Promise(y => y()))
      .catch(e => new Promise((_, n) => n('intercepted')))
  },

  didUpdate() {
    if (this.isMounted) {
      iter([this._parseFrags, this._parseVariables], (fn: () => void) => fn.call(this))

      if (this.props) {
        el.style.backgroundColor = this.props.toggled ? '#f36' : '#FFF'
      }
    }
  },

  destroyers: [],
  willUnmount() {
    const { current = {} } = this.props || {}
    return Promise.all(this.destroyers.map(fn => new Promise(y => fn(current) && y())))
  },

  async unmount() {
    await this.willUnmount()

    if (el.parentElement) {
      el.parentElement.removeChild(el)
    }
  },

  $events: [],
  _addEvents() {
    iter(this.$events, ({ type, events }: IEventGroup) => {
      el.addEventListener(type, e =>
        iter(
          events,
          ({ selector, handle }: IEvent): -1 | void => {
            let target = e.target as HTMLElement

            if (!target) {
              return -1
            }

            if (target.nodeType === 3 && target.parentElement) {
              target = target.parentElement
            }

            if (target.matches(selector)) {
              try {
                raf(() => handle.call(this)(this.props))
              } catch (e) {
                console.trace(e)
              }

              return -1
            }
          }
        )
      )

      this.$events.pop()
    })
  },

  $frags: [],
  _parseFrags() {
    const { current = {}, previous = {} } = this.props || {}

    iter(
      this.$frags,
      (obj: IFrag): -1 | void => {
        const { adjSelector, $frag, assert } = obj
        const $sibling = el.querySelector(adjSelector)
        const $parent = $sibling && $sibling.parentNode
        const $next = $sibling && $sibling.nextSibling

        if (!($sibling && $parent && $next)) {
          return -1
        }

        assert
          .call(this, current, previous)
          .then(() => raf(() => $parent.insertBefore($frag.cloneNode(true), $next)))
          .catch((rm: boolean) => rm && raf(() => $parent.removeChild($next)))
      }
    )
  },

  $vars: [],
  _parseVariables() {
    const { current = {} } = this.props || {}

    iter(
      this.$vars,
      (obj: IPropVar): -1 | void => {
        const { prop, selector } = obj
        const $foundVars = el.querySelectorAll(selector)

        if (!($foundVars && prop in current)) {
          return -1
        }

        const $frag = document.createDocumentFragment()
        $frag.appendChild(document.createTextNode(current[prop]))

        iter([].slice.call($foundVars), ($var: HTMLElement) => {
          raf(() => $var.replaceChild($frag.cloneNode(true), $var.childNodes[0]))
        })
      }
    )
  }
})

// ------------------------------------------------------

export const attachComponent = async (el: HTMLElement, initialProps: IObj = {}): Promise<Impl> => {
  if (el.hasOwnProperty('__nyxt__')) {
    return (el as INYXT).__nyxt__
  }

  const c: Impl = component(el)

  c.$vars.push(
    {
      prop: 'count',
      selector: '[data-key="0.1"]'
    },
    {
      prop: 'title',
      selector: '[data-key="0.4"]'
    }
  )

  c.$frags.push({
    $frag: frag('<div>toggled</div>'),
    adjSelector: '[data-key="0.0"]',
    assert({ toggled = false }, previous = {}) {
      const diff = toggled ^ previous.toggled
      return new Promise((y, n) => (toggled && diff ? y() : n(diff)))
    }
  })

  c.$events.push({
    events: [
      {
        handle() {
          return () => {
            this.props.toggled ^= 1
          }
        },
        selector: '[data-key="0.0"]'
      },
      {
        handle() {
          return () => {
            this.props.count += 1
          }
        },
        selector: '[data-key="0.2"]'
      },
      {
        handle() {
          return () => this.unmount()
        },
        selector: '[data-key="0.3"]'
      }
    ],
    type: 'mousedown'
  })

  Object.defineProperty(c, 'props', {
    value: new Proxy(
      {
        current: initialProps,
        next: {},
        previous: {}
      },
      {
        set: (props: IProps, prop: string, newValue: any): boolean => {
          props.next = {
            ...props.current,
            [prop]: newValue
          }

          c.shouldUpdate()
            .then(() => c.didUpdate())
            .catch(e => console.trace(e))

          props.previous = props.current
          props.current = props.next
          props.next = {}

          return true
        },

        get: (props: IProps, prop: string): IObj => {
          if (prop in props) {
            return props[prop]
          }

          return props.current[prop]
        }
      }
    )
  })

  Object.defineProperty(el, '__nyxt__', {
    value: c
  })

  return raf(() => c.didMount()), c
}
