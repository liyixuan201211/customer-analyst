import React, { Component } from 'react';

// 错误边界：单个面板/组件渲染崩溃时兜底，不让整个应用白屏
export default class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { console.error('[ErrorBoundary]', err, info); }
  render() {
    if (this.state.err) {
      return (
        <div className="p-4 text-xs text-danger">
          <div className="font-medium mb-1">此区域渲染出错</div>
          <div className="text-fg-3 break-words mb-2">{String(this.state.err?.message || this.state.err)}</div>
          <button onClick={() => this.setState({ err: null })} className="rounded-lg bg-elev border border-line-2 px-2 py-1 hover:bg-bg-3">重试</button>
        </div>
      );
    }
    return this.props.children;
  }
}
