import { DataLayerObject } from './DataLayerObject';
import { GtmIdContainer, GtmQueryParams } from './GtmContainer';
import { GtmSupportOptions } from './options';

declare global {
  // eslint-disable-next-line jsdoc/require-jsdoc
  interface Window {
    /**
     * `dataLayer` used by GTM.
     *
     * @see [developers.google.com/tag-manager/devguide](https://developers.google.com/tag-manager/devguide)
     */
    dataLayer?: DataLayerObject[];
  }
}

/**
 * Options for `loadScript` function.
 */
export interface LoadScriptOptions {
  /**
   * Add url query string when load gtm.js with GTM ID.
   */
  queryParams: GtmQueryParams;
  /**
   * Script can be set to `defer` to speed up page load at the cost of less accurate results (in case visitor leaves before script is loaded, which is unlikely but possible).
   */
  defer: boolean;
  /**
   * Will add `async` and `defer` to the script tag to not block requests for old browsers that do not support `async`.
   */
  compatibility: boolean;
  /**
   * Will add `nonce` to the script tag.
   *
   * @see [Using Google Tag Manager with a Content Security Policy](https://developers.google.com/tag-manager/web/csp)
   */
  nonce: string;
}

/**
 * Load GTM script tag.
 *
 * @param id GTM ID.
 * @param config The config object.
 */
export function loadScript(id: string, config: LoadScriptOptions): void {
  const doc: Document = document;
  const script: HTMLScriptElement = doc.createElement('script');

  window.dataLayer = window.dataLayer ?? [];

  window.dataLayer?.push({
    event: 'gtm.js',
    'gtm.start': new Date().getTime()
  });

  if (!id) {
    return;
  }

  script.async = !config.defer;
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  script.defer = Boolean(config.defer || config.compatibility);

  if (config.nonce) {
    script.nonce = config.nonce;
  }

  const queryString: URLSearchParams = new URLSearchParams({
    id,
    ...(config.queryParams ?? {})
  });
  script.src = `https://www.googletagmanager.com/gtm.js?${queryString}`;
  doc.body.appendChild(script);
}

/**
 * Check if GTM script is in the document.
 *
 * @returns `true` if in the `document` is a `script` with `src` containing `googletagmanager.com/gtm.js`, otherwise `false`.
 */
export function hasScript(): boolean {
  return Array.from(document.getElementsByTagName('script')).some((script) =>
    script.src.includes('googletagmanager.com/gtm.js')
  );
}

/**
 * Object definition for a track event.
 */
export interface TrackEventOptions {
  [key: string]: any;
  event?: string;
  category?: any;
  action?: any;
  label?: any;
  value?: any;
  noninteraction?: boolean;
}

/**
 * The GTM Support main class.
 */
export class GtmSupport {
  /** GTM Container ID. */
  protected readonly id: string | string[] | GtmIdContainer[];
  /** GTM Support Options. */
  protected readonly options: Omit<GtmSupportOptions, 'id'>;

  /**
   * Constructs a new `GtmSupport` instance.
   *
   * @param options Options.
   */
  public constructor(options: GtmSupportOptions) {
    this.id = options.id;
    this.options = {
      enabled: true,
      debug: false,
      loadScript: true,
      defer: false,
      compatibility: false,
      ...options
    };
  }

  /**
   * Whether the script is running in a browser or not.
   *
   * You can override this function if you need to.
   *
   * @returns `true` if the script runs in browser context.
   */
  public isInBrowserContext: () => boolean = () => typeof window !== 'undefined';

  /**
   * Check if plugin is enabled.
   *
   * @returns `true` if the plugin is enabled, otherwise `false`.
   */
  public enabled(): boolean {
    return this.options.enabled ?? true;
  }

  /**
   * Enable or disable plugin.
   *
   * When enabling with this function, the script will be attached to the `document` if:
   *
   * - the script runs in browser context
   * - the `document` doesn't have the script already attached
   * - the `loadScript` option is set to `true`
   *
   * @param enabled `true` to enable, `false` to disable. Default: `true`.
   */
  public enable(enabled: boolean = true): void {
    this.options.enabled = enabled;

    if (this.isInBrowserContext() && enabled && !hasScript() && this.options.loadScript) {
      if (Array.isArray(this.id)) {
        this.id.forEach((id: string | GtmIdContainer) => {
          if (typeof id === 'string') {
            loadScript(id, { ...this.options } as LoadScriptOptions);
          } else {
            loadScript(id.id, { ...this.options, queryParams: id.queryParams } as LoadScriptOptions);
          }
        });
      } else {
        loadScript(this.id, { ...this.options } as LoadScriptOptions);
      }
    }
  }

  /**
   * Check if plugin is in debug mode.
   *
   * @returns `true` if the plugin is in debug mode, otherwise `false`.
   */
  public debugEnabled(): boolean {
    return this.options.debug ?? false;
  }

  /**
   * Enable or disable debug mode.
   *
   * @param enable `true` to enable, `false` to disable.
   */
  public debug(enable: boolean): void {
    this.options.debug = enable;
  }

  /**
   * Returns the `window.dataLayer` array if the script is running in browser context and the plugin is enabled,
   * otherwise `false`.
   *
   * @returns The `window.dataLayer` if script is running in browser context and plugin is enabled, otherwise `false`.
   */
  public dataLayer(): DataLayerObject[] | false {
    if (this.isInBrowserContext() && this.options.enabled) {
      return (window.dataLayer = window.dataLayer ?? []);
    }
    return false;
  }

  /**
   * Track a view event with `event: "content-view"`.
   *
   * The event will only be send if the script runs in browser context and the if plugin is enabled.
   *
   * If debug mode is enabled, a "Dispatching TrackView" is logged,
   * regardless of whether the plugin is enabled or the plugin is being executed in browser context.
   *
   * @param screenName Name of the screen passed as `"content-view-name"`.
   * @param path Path passed as `"content-name"`.
   * @param additionalEventData Additional data for the event object. `event`, `"content-name"` and `"content-view-name"` will always be overridden.
   */
  public trackView(screenName: string, path: string, additionalEventData: Record<string, any> = {}): void {
    if (this.options.debug) {
      console.log('[GTM-Support]: Dispatching TrackView', { screenName, path });
    }

    if (this.isInBrowserContext() && this.options.enabled) {
      const dataLayer: DataLayerObject[] = (window.dataLayer = window.dataLayer ?? []);
      dataLayer.push({
        ...additionalEventData,
        event: 'content-view',
        'content-name': path,
        'content-view-name': screenName
      });
    }
  }

  /**
   * Track an event.
   *
   * The event will only be send if the script runs in browser context and the if plugin is enabled.
   *
   * If debug mode is enabled, a "Dispatching event" is logged,
   * regardless of whether the plugin is enabled or the plugin is being executed in browser context.
   *
   * @param param0 Object that will be used for configuring the event object passed to GTM.
   * @param param0.event `event`, default to `"interaction"` when pushed to `window.dataLayer`.
   * @param param0.category Optional `category`, passed as `target`.
   * @param param0.action Optional `action`, passed as `action`.
   * @param param0.label Optional `label`, passed as `"target-properties"`.
   * @param param0.value Optional `value`, passed as `value`.
   * @param param0.noninteraction Optional `noninteraction`, passed as `"interaction-type"`.
   */
  public trackEvent({
    event,
    category = null,
    action = null,
    label = null,
    value = null,
    noninteraction = false,
    ...rest
  }: TrackEventOptions = {}): void {
    if (this.options.debug) {
      console.log('[GTM-Support]: Dispatching event', {
        event,
        category,
        action,
        label,
        value,
        ...rest
      });
    }

    if (this.isInBrowserContext() && this.options.enabled) {
      const dataLayer: DataLayerObject[] = (window.dataLayer = window.dataLayer ?? []);
      dataLayer.push({
        event: event ?? 'interaction',
        target: category,
        action: action,
        'target-properties': label,
        value: value,
        'interaction-type': noninteraction,
        ...rest
      });
    }
  }
}
