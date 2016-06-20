function createOS(global: { process: Process; }) {

  return {
    EOL: '\n',
    tmpdir: () => '/.tmp',
    hostname: () => 'localhost',
    type: () => 'Linux',
    arch: () => global.process.arch,
    platform: () => global.process.platform,
    release: () => '3.16.0-38-generic',
    uptime: () => global.process.uptime(),
    loadavg: () => [0.7275390625, 0.65576171875, 0.4658203125],
    totalmem: () => 3680739328 + ((Math.random() * 1000) | 0),
    freemem: () => 2344873984 - ((Math.random() * 1000) | 0),
    cpus: () => [
    	{ model: 'AMD A4-1250 APU with Radeon(TM) HD Graphics', speed: 800, times: { user: 8058000, nice: 29600, sys: 1079400, idle: 128185400, irq: 0 } },
      { model: 'AMD A4-1250 APU with Radeon(TM) HD Graphics', speed: 800, times: { user: 7779400, nice: 33000, sys: 1069200, idle: 127970900, irq: 0 } }
		],
    networkInterfaces: () => {
      return {
        lo: [
          { address: '127.0.0.1', family: 'IPv4', internal: true },
          { address: '::1', family: 'IPv6', internal: true }
        ],
        wlan0: [
          { address: '192.168.1.3', family: 'IPv4', internal: false },
          { address: 'fe80::8256:f2ff:fe04:3d29', family: 'IPv6', internal: false }
        ]
      }
    }
  };
}