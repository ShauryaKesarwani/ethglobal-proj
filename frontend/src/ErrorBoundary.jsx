import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state = { hasError:false, err:null }; }
  static getDerivedStateFromError(err){ return { hasError:true, err }; }
  componentDidCatch(err, info){ console.error("Boundary caught:", err, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <pre className="text-xs mt-2 p-3 bg-neutral-100 rounded">
            {String(this.state.err)}
          </pre>
          <button className="mt-3 px-3 py-2 border rounded" onClick={() => location.reload()}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}