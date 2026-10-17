import { useEffect, useReducer, useRef } from 'react'
import { PlayerClient } from './playerClient.js'

const init = {
  status: 'connecting', // connecting | joined | lost | rejected | notfound | failed
  reason: '',
  phase: 'lobby', // lobby | question | result | board | end
  players: [],
  q: null,
  chosen: null,
  endAt: 0,
  result: null,
  board: null,
  me: null,
  last: false,
}

function reducer(s, a) {
  switch (a.type) {
    case 'status':
      return { ...s, status: a.status, reason: a.reason || s.reason }
    case 'chose':
      return { ...s, chosen: a.choice }
    case 'msg': {
      const m = a.msg
      switch (m.t) {
        case 'joined': return { ...s, status: 'joined' }
        case 'rejected': return { ...s, status: 'rejected', reason: m.reason }
        case 'lobby': return { ...s, phase: 'lobby', players: m.players }
        case 'question': return { ...s, phase: 'question', q: m, chosen: m.answered, endAt: Date.now() + m.remaining, result: null }
        case 'result': return { ...s, phase: 'result', result: m }
        case 'board': return { ...s, phase: 'board', board: m.top, me: m.me, last: m.last }
        case 'end': return { ...s, phase: 'end', board: m.top, me: m.me }
        default: return s
      }
    }
    default:
      return s
  }
}

export function usePlayer(pin, profile) {
  const [state, dispatch] = useReducer(reducer, init)
  const client = useRef(null)

  useEffect(() => {
    const c = new PlayerClient(
      (msg) => dispatch({ type: 'msg', msg }),
      (status, reason) => dispatch({ type: 'status', status, reason })
    )
    client.current = c
    c.connect(pin, profile)
    return () => c.close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const answer = (choice) => {
    if (state.chosen != null || state.phase !== 'question' || !state.q) return
    client.current.send({ t: 'answer', idx: state.q.idx, choice })
    dispatch({ type: 'chose', choice })
  }

  return { state, answer }
}
