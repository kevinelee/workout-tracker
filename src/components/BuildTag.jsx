import { APP_VERSION } from '../version'
import './BuildTag.css'

// Tiny version stamp in the top-left corner. If it doesn't match the latest
// deploy, the phone is serving a cached build — hard refresh.
export default function BuildTag() {
  return <span className="build-tag" aria-hidden="true">v{APP_VERSION}</span>
}
