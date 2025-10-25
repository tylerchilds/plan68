import { StorageClient } from "@wallet.storage/fetch-client";
import { Ed25519Signer } from "@did.coop/did-key-ed25519"
import { innerHTML } from 'diffhtml'

const renderers = {}
const styleDictionary = {}
const eventMaze = {}
const reactiveFunctions = {}

function addRenderer(link, compositor, lifeCycle) {
  if(!reactiveFunctions[link]) {
    reactiveFunctions[link] = {}
  }

  renderers[link] = {
    compositor,
    lifeCycle
  }

  teach(link, { '_initialized': true })
}

const PLAN68_ROOT_DIR = '/root/'

export const walletDefaultHost = self.PLAN98_WAS_HOST || 'http://localhost:8080'

/**
 * construct an Agent, which interacts with the network on behalf of the end-user.
 * The Agent has a unique identifier, and is able to product digital signatures.
 */
async function newAgent() {
  const id = self.crypto.randomUUID()
  const signer = await Ed25519Signer.generate()

  return {
    id,
    asJSON: signer.toJSON(),
  }
}

/**
 * The top-level agent used by the rest of this module.
 * Prefer to reuse a previous agent by loading it from localStorage.
 * If there is no previous rootAgent, create a new one,
 * but persist it to localStorage so it is reused on subsequent page loads.
 */
let rootAgent = localStorage.getItem('__plan68/access')
if(!rootAgent){
  rootAgent = await newAgent()
  localStorage.setItem('__plan68/access', JSON.stringify(rootAgent))
} else {
  rootAgent = JSON.parse(rootAgent)
}

let signer = await Ed25519Signer.fromJSON(JSON.stringify(rootAgent.asJSON))
const storage = new StorageClient(new URL(walletDefaultHost))

export function getSigner() {
  return signer
}

export function setSigner(s) {
  signer = s
}

const logs = {}

export function insights() {
  return logs
}

function insight(name, link) {
  if(!logs[`${name}:${link}`]) {
    logs[`${name}:${link}`] = 0
  }
  logs[`${name}:${link}`] += 1
}


function react(link) {
  if(!reactiveFunctions[link]) return

  Object.keys(reactiveFunctions[link])
    .map(id => reactiveFunctions[link][id]())
}

const backupAgents = {}

function ensureAgentDispatcher(link) {
  if(!backupAgents[link]) {
    backupAgents[link] = []
  }
}

function addAgent(link, agent) {
  ensureAgentDispatcher(link)
  backupAgents[link].push(agent)
}

function backup(link) {
  ensureAgentDispatcher(link)

  const allAgents = backupAgents[link]

  allAgents.map(callback => callback())
}

function plan68path(target) {
  return PLAN68_ROOT_DIR + target.id
}

const notifications = {
  [react.toString()]: react,
  [backup.toString()]: backup,
}

function notify(link) {
  Object.keys(notifications)
    .map(key => notifications[key](link))
}

const store = createStore({}, notify)

function update(link, target) {
  if(!renderers[link]) return

  insight('elf:update', link)

  const { lifeCycle, compositor } = renderers[link]
  if(lifeCycle.beforeUpdate) {
    lifeCycle.beforeUpdate.call(this, target)
  }

  const html = compositor.call(this, target)
  if(html) innerHTML(target, html)

  if(lifeCycle.afterUpdate) {
    lifeCycle.afterUpdate.call(this, target)
  }
}

const middleware = [
  c2sSync
]

async function c2sSync(link, target) {
  if(target.getAttribute('offline') === 'true') return
  if(target['c2sSync']) return
  target['c2sSync'] = true

  downTheData(link, target)
  await guaranteeTheData(link, target)
  upTheData(link, target)
}

function draw(link, compositor, lifeCycle={}) {
  insight('elf:draw', link)
  addRenderer(link, compositor, lifeCycle)
}


function style(link, stylesheet) {
  insight('elf:style', link)
  const styles = `
    <style type="text/css" data-link="${link}">
      ${stylesheet.replaceAll('&', `${link} slot`)}
    </style>
  `;

  styleDictionary[link] = styles
}

export function learn(link) {
  insight('elf:learn', link)
  return store.get(link) || {}
}

export function teach(link, knowledge, nuance = (s, p) => ({...s,...p})) {
  insight('elf:teach', link)
  store.set(link, knowledge, nuance)
}

export function when(link, type, arg2, callback) {
  if(typeof arg2 === 'function') {
    insight('elf:when:'+type, link)
    return listen.call(this, link, type, '', arg2)
  } else {
    const nested = `${link} ${arg2}`
    insight('elf:when:'+type, nested)
    return listen.call(this, link, type, arg2, callback)
  }
}

function declare(elf) {
  if (!customElements.get(elf.link)) {
    class WebComponent extends HTMLElement {
      constructor() {
        super();
      }

      connectedCallback() {
        if (!this._initialized) {
          dispatchCreate(elf.link, this)
          this._initialized = true;
        }
      }
    }

    customElements.define(elf.link, WebComponent);
  }
}

export default function elf(link, initialState = {}) {
  if(typeof link !== 'string') {
    declare(link)
    return
  }

  insight('elf', link)
  teach(link, initialState)

  return {
    link,
    learn: learn.bind(this, link),
    draw: draw.bind(this, link),
    style: style.bind(this, link),
    when: when.bind(this, link),
    teach: teach.bind(this, link),
  }
}

export function subscribe(fun) {
  notifications[fun.toString] = fun
}

export function unsubscribe(fun) {
  if(notifications[fun.toString]) {
    delete notifications[fun.toString]
  }
}

export function listen(link, type, scope, handler = () => null) {
  const callback = (event) => {
    if(
      event.target &&
      event.target.matches &&
      event.target.matches(scope)
    ) {

      insight('elf:listen:'+type, link)
      handler.call(this, event);
    }
  };

  const options = { capture: true, passive: false }

  addToEventMaze(link, { type, callback, options })

  function addToEventMaze(link, eventMetadata) {
    if(!eventMaze[link]) {
      eventMaze[link] = []
    }

    eventMaze[link].push(eventMetadata)
  }

  return function unlisten(target) {
    target.removeEventListener(type, callback, options);
  }
}

function dispatchCreate(link, target) {
  insight('elf:create', target.localName)
  try {
    if(!target.id) target.id = self.crypto.randomUUID()
  } catch(e) {
    if(!target.id) target.id = uuidv4()
  }
  middleware.forEach(x => x(link, target))
  const slot = document.createElement('slot')
  target.appendChild(slot)
  const draw = update.bind(this, link, slot)
  reactiveFunctions[link][target.id] = draw
  draw()
  if(styleDictionary[link]) {
    target.insertAdjacentHTML("beforeend", styleDictionary[link])
  }

  if(eventMaze[link]) {
    eventMaze[link].forEach(({ type, callback, options }) => {
      target.addEventListener(type, callback, options);
    })
  }
}

function createStore(initialState = {}, subscribe = () => null) {
  let state = {
    ...initialState
  };

  return {
    set: function(link, knowledge, nuance) {
      const wisdom = nuance(state[link] || {}, knowledge);

      state = {
        ...state,
        [link]: wisdom
      };

      subscribe(link);
    },

    get: function(link) {
      return state[link];
    }
  }
}

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function getSpace(uuid) {
  return storage.space({
    signer,
    id: `urn:uuid:${uuid}`
  })
}

export async function get(src) {
  const resource = this.space.resource(src)

  return await resource.get({ signer })
    .then(async res => {
      if(!res.ok) {
        throw new Error('Not OKAY!')
      }
      return (await res.blob())
    })
}

export async function touch(src, config={ type: 'application/json' }) {
  const resource = this.space.resource(src)

  const typedBlob = new Blob([JSON.stringify({})], config)
  return await resource.put(typedBlob, { signer })
    .then(res => {
      console.debug({ res })
      return res
    })
}

window.touch = touch

async function guaranteeTheData(link, target) {
  const space = getSpace(target.id)

  const linkset = space.resource(`linkset`)
  const spaceObject = {
    controller: signer.controller,
    link: linkset.path,
  }
  const spaceObjectBlob = new Blob(
    [JSON.stringify(spaceObject)],
    { type: 'application/json' },
  )

  // send PUT request to update the space
  const responseToPutSpace = await space.put(spaceObjectBlob)
    .then(res => {
      console.debug({ res })
      return res
    })
    .catch(e => {
      console.debug(e)
    })

  if (!responseToPutSpace.ok) throw new Error(
    `Failed to put space: ${responseToPutSpace.status} ${responseToPutSpace.statusText}`, {
    cause: {
      responseToPutSpace
    }
  })
}

function upTheData(link, target) {
  addAgent(link, function callbackLikeAnOperator() {
    const space = getSpace(target.id)

    const state = learn(link)

    put.call({ space }, plan68path(target), JSON.stringify(state), { type: 'application/json' })
      .catch(error => { console.warn(error) });
  })
}

function downTheData(link, target) {
  const space = getSpace(target.id)
  get.call({ space }, plan68path(target))
    .then(blob => {
      if(blob) {
        blob.text().then(str => JSON.parse(str)).then(data => {
          teach(link, data)
        })
      }
    })
}

export async function put(src, file, config={ type: 'text/plain' }) {
  const resource = this.space.resource(src)

  const typedBlob = new Blob([file], config)
  return await resource.put(typedBlob, { signer })
    .then(res => {
      return res
    })
}

export async function del(src) {
  const resource = this.space.resource(src)

  return await resource.delete()
    .then(res => {
      console.debug({ res })
      return res
    })
}

window.eventMaze = eventMaze
