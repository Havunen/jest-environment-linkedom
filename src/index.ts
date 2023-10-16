import {parseHTML} from 'linkedom'
import {LegacyFakeTimers, ModernFakeTimers} from '@jest/fake-timers';
import {ModuleMocker} from 'jest-mock';
import {Context, createContext, runInContext} from 'vm';
import {storageMock} from './mocks/storageMock'

const denyList = new Set([
  'GLOBAL',
  'root',
  'global',
  'globalThis',
  'Buffer',
  'ArrayBuffer',
  'Uint8Array',
  // if env is loaded within a jest test
  'jest-symbol-do-not-touch',
]);

const nodeGlobals = new Map(
    (Object.getOwnPropertyNames(globalThis))
        .filter(global => !denyList.has(global))
        .map(nodeGlobalsKey => {
          const descriptor = Object.getOwnPropertyDescriptor(
              globalThis,
              nodeGlobalsKey,
          );

          if (!descriptor) {
            throw new Error(
                `No property descriptor for ${nodeGlobalsKey}, this is a bug in Jest.`,
            );
          }

          return [nodeGlobalsKey, descriptor];
        }),
);


function isString(value) {
  return typeof value === 'string';
}

function mapGlobalsFromLinkedom(global: Record<string, any>, dom: Record<string, any>) {
  global.document = dom.document;
  global.window = dom.window;
  global.navigator = dom.window.navigator

  global.Event = dom.Event;
  global.CustomEvent = dom.CustomEvent;

  global.localStorage = dom.window.localStorage
  global.sessionStorage = dom.window.sessionStorage

  global.Attr = dom.Attr
  global.CharacterData = dom.CharacterData
  global.Comment = dom.Comment
  global.DocumentFragment = dom.DocumentFragment
  global.DocumentType = dom.DocumentType
  global.Element = dom.Element
  global.Node = dom.Node
  global.ShadowRoot = dom.ShadowRoot
  global.Text = dom.Text
  global.SVGElement = dom.SVGElement

  global.HTMLElement = dom.HTMLElement
  global.HTMLTemplateElement = dom.HTMLTemplateElement
  global.HTMLHtmlElement = dom.HTMLHtmlElement
  global.HTMLScriptElement = dom.HTMLScriptElement
  global.HTMLFrameElement = dom.HTMLFrameElement
  global.HTMLIFrameElement = dom.HTMLIFrameElement
  global.HTMLObjectElement = dom.HTMLObjectElement
  global.HTMLHeadElement = dom.HTMLHeadElement
  global.HTMLBodyElement = dom.HTMLBodyElement
  global.HTMLStyleElement = dom.HTMLStyleElement
  global.HTMLTimeElement = dom.HTMLTimeElement
  global.HTMLFieldSetElement = dom.HTMLFieldSetElement
  global.HTMLEmbedElement = dom.HTMLEmbedElement
  global.HTMLHRElement = dom.HTMLHRElement
  global.HTMLProgressElement = dom.HTMLProgressElement
  global.HTMLParagraphElement = dom.HTMLParagraphElement
  global.HTMLTableElement = dom.HTMLTableElement
  global.HTMLFrameSetElement = dom.HTMLFrameSetElement
  global.HTMLLIElement = dom.HTMLLIElement
  global.HTMLBaseElement = dom.HTMLBaseElement
  global.HTMLDataListElement = dom.HTMLDataListElement
  global.HTMLInputElement = dom.HTMLInputElement
  global.HTMLParamElement = dom.HTMLParamElement
  global.HTMLMediaElement = dom.HTMLMediaElement
  global.HTMLAudioElement = dom.HTMLAudioElement
  global.HTMLHeadingElement = dom.HTMLHeadingElement
  global.HTMLDirectoryElement = dom.HTMLDirectoryElement
  global.HTMLQuoteElement = dom.HTMLQuoteElement
  global.HTMLCanvasElement = dom.HTMLCanvasElement
  global.HTMLLegendElement = dom.HTMLLegendElement
  global.HTMLOptionElement = dom.HTMLOptionElement
  global.HTMLSpanElement = dom.HTMLSpanElement
  global.HTMLMeterElement = dom.HTMLMeterElement
  global.HTMLVideoElement = dom.HTMLVideoElement
  global.HTMLTableCellElement = dom.HTMLTableCellElement
  global.HTMLTitleElement = dom.HTMLTitleElement
  global.HTMLOutputElement = dom.HTMLOutputElement
  global.HTMLTableRowElement = dom.HTMLTableRowElement
  global.HTMLDataElement = dom.HTMLDataElement
  global.HTMLMenuElement = dom.HTMLMenuElement
  global.HTMLSelectElement = dom.HTMLSelectElement
  global.HTMLBRElement = dom.HTMLBRElement
  global.HTMLButtonElement = dom.HTMLButtonElement
  global.HTMLMapElement = dom.HTMLMapElement
  global.HTMLOptGroupElement = dom.HTMLOptGroupElement
  global.HTMLDListElement = dom.HTMLDListElement
  global.HTMLTextAreaElement = dom.HTMLTextAreaElement
  global.HTMLFontElement = dom.HTMLFontElement
  global.HTMLDivElement = dom.HTMLDivElement
  global.HTMLLinkElement = dom.HTMLLinkElement
  global.HTMLSlotElement = dom.HTMLSlotElement
  global.HTMLFormElement = dom.HTMLFormElement
  global.HTMLImageElement = dom.HTMLImageElement
  global.HTMLPreElement = dom.HTMLPreElement
  global.HTMLUListElement = dom.HTMLUListElement
  global.HTMLMetaElement = dom.HTMLMetaElement
  global.HTMLPictureElement = dom.HTMLPictureElement
  global.HTMLAreaElement = dom.HTMLAreaElement
  global.HTMLOListElement = dom.HTMLOListElement
  global.HTMLTableCaptionElement = dom.HTMLTableCaptionElement
  global.HTMLAnchorElement = dom.HTMLAnchorElement
  global.HTMLLabelElement = dom.HTMLLabelElement
  global.HTMLUnknownElement = dom.HTMLUnknownElement
  global.HTMLModElement = dom.HTMLModElement
  global.HTMLDetailsElement = dom.HTMLDetailsElement
  global.HTMLSourceElement = dom.HTMLSourceElement
  global.HTMLTrackElement = dom.HTMLTrackElement
  global.HTMLMarqueeElement = dom.HTMLMarqueeElement
}

export default class LinkedomEnvironment {
  public context: Context | null;
  public dom: (Window & typeof globalThis) | null;
  public errorEventListener: ((event) => void) | null;
  public fakeTimers: LegacyFakeTimers<number> | null;
  public moduleMocker: ModuleMocker;
  public fakeTimersModern: ModernFakeTimers | null;
  public global: any;

  private _configuredExportConditions: any[];
  public customExportConditions: any[];

  constructor(config, _context) {
    const {projectConfig} = config;

    const html = typeof projectConfig.testEnvironmentOptions.html === 'string'
        ? projectConfig.testEnvironmentOptions.html
        : '<!DOCTYPE html><html><head></head><body></body></html>'

    this.context = createContext();
    const global = runInContext(
        'this',
        Object.assign(this.context, projectConfig.testEnvironmentOptions)
    );

    // @ts-ignore
    const dom = parseHTML(html, global);

    // @ts-ignore
    (dom.window as any).localStorage = storageMock();
    // @ts-ignore
    (dom.window as any).sessionStorage = storageMock();

    (dom.window as any).URL = {
      revokeObjectURL: function revokeObjectURL() {}
    };
    mapGlobalsFromLinkedom(global, dom);

    if (global == null) {
      throw new Error('JSDOM did not return a Window object');
    }

    const contextGlobals = new Set(
        Object.getOwnPropertyNames(global),
    );
    for (const [nodeGlobalsKey, descriptor] of nodeGlobals) {
      if (!contextGlobals.has(nodeGlobalsKey)) {
        if (descriptor.configurable) {
          Object.defineProperty(global, nodeGlobalsKey, {
            configurable: true,
            enumerable: descriptor.enumerable,
            get() {
              const value = globalThis[nodeGlobalsKey];

              // override lazy getter
              Object.defineProperty(global, nodeGlobalsKey, {
                configurable: true,
                enumerable: descriptor.enumerable,
                value,
                writable: true,
              });

              return value;
            },
            set(value) {
              // override lazy getter
              Object.defineProperty(global, nodeGlobalsKey, {
                configurable: true,
                enumerable: descriptor.enumerable,
                value,
                writable: true,
              });
            },
          });
        } else if ('value' in descriptor) {
          Object.defineProperty(global, nodeGlobalsKey, {
            configurable: false,
            enumerable: descriptor.enumerable,
            value: descriptor.value,
            writable: descriptor.writable,
          });
        } else {
          Object.defineProperty(global, nodeGlobalsKey, {
            configurable: false,
            enumerable: descriptor.enumerable,
            get: descriptor.get,
            set: descriptor.set,
          });
        }
      }
    }

    global.global = global;
    global.Buffer = Buffer;
    global.ArrayBuffer = ArrayBuffer;

    // Node's error-message stack size is limited at 10, but it's pretty useful
    // to see more than that when a test fails.
    global.Error.stackTraceLimit = 100;
    // installCommonGlobals(global, projectConfig.globals);

    // Report uncaught errors.
    this.errorEventListener = event => {
      if (userErrorListenerCount === 0 && event.error != null) {
        process.emit('uncaughtException', event.error);
      }
    };
    dom.addEventListener('error', this.errorEventListener);

    // However, don't report them as uncaught if the user listens to 'error' event.
    // In that case, we assume the might have custom error handling logic.
    const originalAddListener = dom.addEventListener.bind(global);
    const originalRemoveListener = dom.removeEventListener.bind(global);
    let userErrorListenerCount = 0;
    dom.addEventListener = function (
        ...args
    ) {
      if (args[0] === 'error') {
        userErrorListenerCount++;
      }
      return originalAddListener.apply(this, args);
    };
    dom.removeEventListener = function (
        ...args
    ) {
      if (args[0] === 'error') {
        userErrorListenerCount--;
      }
      return originalRemoveListener.apply(this, args);
    };

    if ('customExportConditions' in projectConfig.testEnvironmentOptions) {
      const {customExportConditions} = projectConfig.testEnvironmentOptions;
      if (
          Array.isArray(customExportConditions) &&
          customExportConditions.every(isString)
      ) {
        this._configuredExportConditions = customExportConditions;
      } else {
        throw new Error(
            'Custom export conditions specified but they are not an array of strings',
        );
      }
    }

    this.moduleMocker = new ModuleMocker(global);

    this.fakeTimers = new LegacyFakeTimers({
      config: projectConfig,
      global,
      moduleMocker: this.moduleMocker,
      timerConfig: {
        idToRef: (id) => id,
        refToId: (ref) => ref,
      },
    });

    this.fakeTimersModern = new ModernFakeTimers({
      config: projectConfig,
      global
    });

    this.dom = dom;
    this.global = global;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async setup() {}

  async teardown() {
    if (this.fakeTimers) {
      this.fakeTimers.dispose();
    }
    if (this.fakeTimersModern) {
      this.fakeTimersModern.dispose();
    }
    if (this.dom != null) {
      if (this.errorEventListener) {
        this.dom.removeEventListener('error', this.errorEventListener);
      }
    }
    this.errorEventListener = null;
    this.global = null;
    this.context = null;
    this.dom = null;
    this.fakeTimers = null;
    this.fakeTimersModern = null;
  }

  exportConditions() {
    return this._configuredExportConditions ?? this.customExportConditions;
  }

  getVmContext() {
    return this.context
  }
}

export const TestEnvironment = LinkedomEnvironment;
