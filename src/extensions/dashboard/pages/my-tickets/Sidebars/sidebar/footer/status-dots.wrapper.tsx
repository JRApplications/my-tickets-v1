const Online = () => {
    return <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 0 2px #fff' }}></div>
}

const Away = () => {
    return <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 0 2px #fff' }}></div>
}

const DoNotDisturb = () => {
    return <div style={{ position: 'relative', width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 0 2px #fff' }}>
        <div style={{ position: 'absolute', top: '50%', left: '10%', right: '10%', height: '2px', background: '#fff', transform: 'translateY(-50%)', borderRadius: '1px' }}></div>
    </div>
}

const Offline = () => {
    return <div style={{ width: '8px', height: '8px', borderRadius: '50%', border: '2px solid #71717a', boxShadow: '0 0 0 2px #fff' }}></div>
}

const StatusDots = {
    Online,
    Away,
    DoNotDisturb,
    Offline,
}

export default StatusDots;