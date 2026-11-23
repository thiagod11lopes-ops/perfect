import { publicUrl } from '../utils/publicUrl'

export function CoinIcon({ className = '', size }: { className?: string; size?: number }) {
  const style = size ? { width: size, height: size } : undefined
  return (
    <img
      className={`coin-icon ${className}`.trim()}
      src={publicUrl('/coin.jpg')}
      alt=""
      style={style}
      draggable={false}
    />
  )
}
