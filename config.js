var Config = {
	"domain":     process.env.OPENSHIFT_APP_DNS || '127.0.0.1',

	"serverip":   process.env.OPENSHIFT_NODEJS_IP || process.env.IP || '127.0.0.1',
	"serverport": process.env.OPENSHIFT_NODEJS_PORT || process.env.PORT || '8000',
  
	"clientport": (process.env.OPENSHIFT_NODEJS_PORT) ? '8000':'8080'
};

module.exports = Config;