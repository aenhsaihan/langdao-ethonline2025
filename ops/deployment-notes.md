# Deployment Notes - LangDAO Huddle01 Integration

## Deployment Checklist

### Pre-deployment

- [ ] Smart contract audited and tested
- [ ] Environment variables configured
- [ ] Huddle01 project setup completed
- [ ] Blockchain network selected and funded
- [ ] Domain names and SSL certificates ready

### Smart Contract Deployment

1. **Deploy SessionEscrow.sol**
   ```bash
   # Using Hardhat
   npx hardhat run scripts/deploy.js --network mainnet
   
   # Using Foundry  
   forge create SessionEscrow --rpc-url $RPC_URL --private-key $PRIVATE_KEY
   ```

2. **Verify Contract on Etherscan**
   ```bash
   npx hardhat verify --network mainnet DEPLOYED_CONTRACT_ADDRESS
   ```

3. **Configure Contract Roles**
   ```javascript
   // Grant RELAYER_ROLE to heartbeat service wallet
   await contract.grantRole(RELAYER_ROLE, HEARTBEAT_SERVICE_WALLET);
   ```

### Service Deployment

#### Heartbeat Service (Backend)

**Option 1: VPS/Cloud Server**
```bash
# Install Node.js and dependencies
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and setup
git clone <repository>
cd heartbeat
npm install --production

# Setup PM2
npm install -g pm2
pm2 start index.js --name heartbeat-service
pm2 startup
pm2 save
```

**Option 2: Docker**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 4000
CMD ["node", "index.js"]
```

**Option 3: Serverless (AWS Lambda)**
```javascript
// Use serverless framework with express adapter
const serverless = require('serverless-http');
const app = require('./index');
module.exports.handler = serverless(app);
```

#### Frontend Deployment

**Option 1: Vercel**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

**Option 2: Netlify**
```bash
# Build and deploy
npm run build
netlify deploy --prod --dir=.next
```

**Option 3: Traditional Hosting**
```bash
# Build static files
npm run build
npm run export

# Upload to hosting provider
```

### Environment Configuration

#### Production Environment Variables

**Heartbeat Service**
```env
NODE_ENV=production
PORT=4000
RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
PRIVATE_KEY=0x...
CONTRACT_ADDRESS=0x...
FRONTEND_URL=https://yourdomain.com
```

**Frontend**
```env
NEXT_PUBLIC_HUDDLE01_PROJECT_ID=prod_project_id
NEXT_PUBLIC_HEARTBEAT_URL=https://api.yourdomain.com
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
```

### Security Setup

1. **SSL Certificates**
   ```bash
   # Using Certbot for Let's Encrypt
   sudo certbot --nginx -d yourdomain.com
   ```

2. **Firewall Configuration**
   ```bash
   # UFW rules
   sudo ufw allow 22
   sudo ufw allow 80
   sudo ufw allow 443
   sudo ufw allow 4000
   sudo ufw enable
   ```

3. **Nginx Configuration**
   ```nginx
   server {
       listen 443 ssl;
       server_name api.yourdomain.com;
       
       location / {
           proxy_pass http://localhost:4000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

### Monitoring Setup

#### Server Monitoring
```bash
# Install monitoring tools
npm install -g pm2-monitoring

# Setup Datadog/New Relic agents
# Configure application performance monitoring
```

#### Application Logging
```javascript
// Use structured logging
const winston = require('winston');
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### Database Setup (Optional)

For persistent session storage:

```javascript
// Redis for session cache
const redis = require('redis');
const client = redis.createClient(process.env.REDIS_URL);

// PostgreSQL for permanent records
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
```

### Load Balancing

For high availability:

```yaml
# docker-compose.yml
version: '3.8'
services:
  app1:
    build: .
    ports:
      - "4001:4000"
  app2:
    build: .
    ports:
      - "4002:4000"
  nginx:
    image: nginx
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
```

### Backup Strategy

1. **Smart Contract State**
   - Monitor events and store off-chain
   - Regular state snapshots

2. **Application Data**
   ```bash
   # Database backups
   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
   
   # Configuration backups
   tar -czf config_backup.tar.gz /etc/nginx/ /home/app/.env
   ```

### Testing in Production

1. **Smoke Tests**
   ```bash
   # Health check
   curl https://api.yourdomain.com/health
   
   # WebSocket test
   wscat -c wss://api.yourdomain.com
   ```

2. **Load Testing**
   ```bash
   # Using Artillery
   artillery run load-test.yml
   ```

### Rollback Plan

1. **Code Rollback**
   ```bash
   # Using PM2
   pm2 reload ecosystem.config.js --update-env
   
   # Using Docker
   docker-compose up -d --no-deps app
   ```

2. **Database Migration Rollback**
   ```bash
   # Revert migrations if needed
   npm run migrate:rollback
   ```

### Post-deployment Tasks

- [ ] Verify all endpoints are responding
- [ ] Test complete user flow
- [ ] Monitor error logs
- [ ] Check smart contract interactions
- [ ] Validate heartbeat timing
- [ ] Test disconnect scenarios
- [ ] Verify payment calculations
- [ ] Setup alerting thresholds
- [ ] Document any issues found
- [ ] Update team on deployment status

### Production URLs

**Mainnet Deployment Example:**
- Frontend: https://langdao.com
- API: https://api.langdao.com
- Contract: 0x1234...5678 (Ethereum Mainnet)
- Monitoring: https://dashboard.langdao.com

### Emergency Procedures

1. **Service Down**
   ```bash
   # Quick restart
   pm2 restart heartbeat-service
   
   # Check logs
   pm2 logs heartbeat-service
   ```

2. **Smart Contract Issues**
   ```bash
   # Pause contract if emergency function exists
   cast send $CONTRACT_ADDRESS "pause()" --private-key $ADMIN_KEY
   ```

3. **Database Issues**
   ```bash
   # Failover to backup
   # Update connection string
   # Restart applications
   ```

---

**Important Notes:**

- Always test deployment process in staging first
- Keep rollback scripts ready
- Monitor closely for first 24 hours after deployment
- Have emergency contacts available
- Document any production-specific configurations
