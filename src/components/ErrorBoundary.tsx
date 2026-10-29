'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * Catches anything a page throws during render or in an effect, so a
 * single bad expression cannot take the site down.
 *
 * Why this exists rather than just fixing each case: four separate
 * "Application error: a client-side exception has occurred" pages have
 * shipped in as many days, and every one of them was a page rendering
 * fine on the server and throwing in the browser. The response was a
 * correct document in all four cases, so nothing that inspects the site
 * from outside can tell they are broken — only a browser sees it. Static
 * checking catches some of them and none of the rest.
 *
 * A boundary changes the failure mode. Instead of a blank page with a
 * stack trace, the owner gets a message and a way back, and the buyer
 * gets a page that still names the product they were looking at.
 *
 * The digest is shown so a report can be matched to a build.
 */

type Props = {
  children: ReactNode;
  /* Chinese for the admin, English for buyers: the audience for each is
     a different person, and an owner who cannot read the message cannot
     act on it. */
  lang?: 'zh' | 'en';
  /* What the visitor was trying to reach, so the fallback can send them
     back to it rather than to the homepage. */
  label?: string;
  backHref?: string;
  /* Called instead of the default "clear the error and re-render". A parent
     that remounts on this signal gets a clean tree, which matters when the
     crash left state behind. */
  onRetry?: () => void;
};

export class ErrorBoundary extends Component<
  Props,
  { error: Error | null }
> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    /* The console entry is what the browser's own error report would have
       shown; keeping it means a report from the owner is diagnosable. */
    console.error('[ErrorBoundary]', this.props.label || '', error, info);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const zh = this.props.lang === 'zh';
    const back = this.props.backHref || '/';
    const retry = this.props.onRetry || (() => this.setState({ error: null }));

    return (
      <div className="eb">
        <div className="eb-in">
          <div className="eb-ico" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
              stroke="#b45309" strokeWidth="1.7">
              <path d="M12 9v4M12 17h.01" strokeLinecap="round" />
              <path d="M10.3 3.9L2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
            </svg>
          </div>

          <h2>{zh ? '这个页面出了点问题' : 'Something went wrong on this page'}</h2>

          <p className="eb-msg">
            {zh
              ? '内容没有正确显示。返回上一页通常就能继续浏览。'
              : 'This page did not load correctly. Going back usually lets you carry on browsing.'}
          </p>

          <div className="eb-act">
            <button className="btn btn-primary" onClick={retry}>
              {zh ? '重试' : 'Try again'}
            </button>
            <a className="btn btn-ghost" href={back}>
              {zh ? '返回上一页' : 'Go back'}
            </a>
          </div>

          {/* Shown so a screenshot carries enough to find the build. */}
          <p className="eb-digest">{error.message.slice(0, 120)}</p>
        </div>
      </div>
    );
  }
}
