import { withState } from './enhancers'
import { shallowEqual, frag, iter } from './utils'

const attachComponent = (selector, ...args) => {
  const el = document.querySelector(selector)

  if (!el) {
    return
  }

  const impl = Object.create({
    didMount: function() {
      this.processVars.apply(this, arguments)
    },

    didUpdate: function() {
      this.processVars.apply(this, arguments)
      this.processFrags.apply(this, arguments)
    },

    processFrags: function() {
      iter(this.$frags, fragment => {
        const { adjSelector } = fragment
        const $sibling = el.querySelector(adjSelector)

        if (!$sibling) {
          return -1
        }

        const { $frag, assert } = fragment

        assert
          .apply(this, arguments)
          .then(() => $sibling.parentNode.insertBefore($frag.cloneNode(true), $sibling.nextSibling))
          .catch(kill => kill && $sibling.parentNode.removeChild($sibling.nextSibling))
      })

      return this
    },

    processVars: function(state) {
      iter(this.$vars, ({ key, selector }) => {
        const $var = el.querySelector(selector)

        if (!($var && key in state)) {
          return -1
        }

        $var.textContent = state[key]
      })
    }
  })

  Object.defineProperty(impl, 'state', {
    writable: true,
    value: new Proxy(
      {
        count: 0,
        toggled: 0
      },
      {
        set: (state, prop, nv) => {
          const oldState = Object.assign({}, state)
          const ov = oldState[prop]

          if (!shallowEqual(ov, nv)) {
            state[prop] = nv
            impl.didUpdate.call(impl, state, oldState)
          }

          return 1
        }
      }
    )
  })

  Object.defineProperty(impl, 'events', {
    value: [
      {
        type: 'click',
        events: [
          {
            selector: '[data-key="0.0"]',
            handle: function() {
              return ({ count, toggled }) => {
                this.state.toggled ^= 1
                this.state.count += 1
              }
            }
          }
        ]
      }
    ]
  })

  Object.defineProperty(impl, '$frags', {
    value: [
      {
        $frag: frag('<div>toggled</div>'),
        adjSelector: '[data-key="0.0"]',
        assert: (state, oldState) => {
          const diff = !shallowEqual(state.toggled, oldState.toggled)
          return new Promise((y, n) => (state.toggled && diff ? y() : n(diff)))
        }
      }
    ]
  })

  Object.defineProperty(impl, '$vars', {
    value: [
      {
        key: 'count',
        selector: '[data-key="0.1"]'
      }
    ]
  })

  iter(impl.events, ({ type, events }) => {
    el.addEventListener(type, e => {
      iter(events, ({ selector, handle }) => {
        if (e.target.matches(selector)) {
          try {
            handle.call(impl, e)(impl.state)
          } catch (e) {
            console.error(e)
          }

          return -1
        }
      })
    })
  })

  window.requestAnimationFrame(() => impl.didMount.call(impl, impl.state))
}

attachComponent('div', withState('toggled', 'setToggle', false), withState('count', 'increment', false))
