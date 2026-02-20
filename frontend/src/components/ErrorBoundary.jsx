import { Component } from "react";

class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return <div>Error occurred: {this.state.error?.message}</div>;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
