# Quick Start: Your First Week at Meticulate Prep

## Day 1: Get Started (2-3 hours)

### Step 1: Set Up the Starter Project

```bash
cd meticulate-prep-starter
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Step 2: Get API Keys

1. **OpenAI API Key** (Required):
   - Sign up at https://platform.openai.com/
   - Get API key from https://platform.openai.com/api-keys
   - Add to `.env` file

2. **Redis** (Optional for Day 1):
   - Install locally: `brew install redis` (Mac) or use Docker
   - Or use Redis Cloud (free tier): https://redis.com/try-free/

3. **PostgreSQL** (Optional for Day 1):
   - Install locally or use Supabase (free tier): https://supabase.com/

### Step 3: Run the Server

```bash
# Copy and edit .env file
cp .env.example .env
# Edit .env with your API keys

# Run server
uvicorn app.main:app --reload
```

Visit http://localhost:8000/docs to see the API docs.

### Step 4: Test the Health Endpoint

```bash
curl http://localhost:8000/health
```

---

## Day 1-2: Implement LLM Service

**Goal**: Make your first LLM API call with retry logic.

### Tasks:

1. **Complete `app/services/llm_service.py`**:
   - Implement `extract_company_data()` method
   - Add proper error handling
   - Track costs (tokens used × cost per token)

2. **Test it**:
   ```python
   # In Python shell or test file
   from app.services.llm_service import LLMService
   service = LLMService()
   result = await service.extract_company_data("OpenAI", "OpenAI is an AI research company...")
   print(result)
   ```

3. **Success Criteria**:
   - [ ] Can extract data from a company name + text
   - [ ] Retries on failure (test by temporarily using wrong API key)
   - [ ] Logs costs per request

---

## Day 2-3: Add Rate Limiting

**Goal**: Prevent hitting API rate limits.

### Implementation Options:

**Option 1: Simple Token Bucket** (Recommended for start)
```python
# app/services/rate_limiter.py
import time
from collections import deque

class TokenBucket:
    def __init__(self, capacity: int, refill_rate: float):
        self.capacity = capacity
        self.tokens = capacity
        self.refill_rate = refill_rate  # tokens per second
        self.last_refill = time.time()
    
    async def acquire(self):
        # Refill tokens based on time passed
        now = time.time()
        elapsed = now - self.last_refill
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_refill = now
        
        if self.tokens >= 1:
            self.tokens -= 1
            return True
        else:
            # Wait until we have a token
            wait_time = (1 - self.tokens) / self.refill_rate
            await asyncio.sleep(wait_time)
            self.tokens -= 1
            return True
```

**Option 2: Use Redis** (Better for distributed systems)
- Use Redis with `redis-py` for distributed rate limiting

### Tasks:

1. Create `app/services/rate_limiter.py`
2. Integrate into `LLMService`
3. Test with concurrent requests

---

## Day 3-4: Add Caching

**Goal**: Avoid redundant LLM calls (saves money + time).

### Implementation:

```python
# app/services/cache_service.py
import redis
import json
import hashlib

class CacheService:
    def __init__(self):
        self.redis_client = redis.from_url(os.getenv("REDIS_URL"))
    
    def _make_key(self, company_name: str) -> str:
        return f"company:{hashlib.md5(company_name.encode()).hexdigest()}"
    
    async def get(self, company_name: str) -> Optional[Dict]:
        key = self._make_key(company_name)
        cached = self.redis_client.get(key)
        if cached:
            return json.loads(cached)
        return None
    
    async def set(self, company_name: str, data: Dict, ttl: int = 3600):
        key = self._make_key(company_name)
        self.redis_client.setex(key, ttl, json.dumps(data))
```

### Tasks:

1. Create `app/services/cache_service.py`
2. Integrate into research endpoint
3. Test cache hits/misses

---

## Day 4-5: Complete Research Endpoint

**Goal**: End-to-end company research.

### Tasks:

1. **Add web scraping** (optional, can use mock data for now):
   ```python
   # Install: pip install beautifulsoup4 requests
   import requests
   from bs4 import BeautifulSoup
   
   async def scrape_company_website(domain: str) -> str:
       # TODO: Scrape and extract text
       pass
   ```

2. **Complete `/research/company` endpoint**:
   - Check cache first
   - Scrape website (if domain provided)
   - Call LLM service
   - Cache result
   - Return structured data

3. **Test end-to-end**:
   ```bash
   curl -X POST http://localhost:8000/api/v1/research/company \
     -H "Content-Type: application/json" \
     -d '{"company_name": "OpenAI", "domain": "openai.com"}'
   ```

---

## Day 5-7: Scale Testing

**Goal**: Prove you can handle 100k+ calls/day.

### Load Testing Setup:

```bash
pip install locust
```

Create `locustfile.py`:
```python
from locust import HttpUser, task, between

class ResearchUser(HttpUser):
    wait_time = between(1, 3)
    
    @task
    def research_company(self):
        self.client.post("/api/v1/research/company", json={
            "company_name": "Test Company",
            "domain": "test.com"
        })
```

Run load test:
```bash
locust -f locustfile.py --host=http://localhost:8000
```

Visit http://localhost:8089 to start the test.

### Success Metrics:

- [ ] Handle 100+ concurrent users
- [ ] <2% error rate
- [ ] <1s p95 latency (with caching)
- [ ] Cost tracking shows <$0.10 per 1000 requests

---

## Next Steps

Once you complete Week 1, move on to:
- **Week 2**: Learning systems + multi-channel messaging
- See `METICULATE_PREP_PLAN.md` for full roadmap

---

## Common Issues & Solutions

### Issue: OpenAI API Rate Limits
**Solution**: Implement rate limiting (Day 2-3)

### Issue: High Costs
**Solution**: 
- Add caching (Day 3-4)
- Use cheaper models for simple tasks
- Batch requests

### Issue: Slow Responses
**Solution**:
- Add caching
- Use streaming responses
- Optimize prompts (fewer tokens)

### Issue: Errors/Timeouts
**Solution**:
- Implement retries (already in template)
- Add circuit breaker pattern
- Monitor and alert

---

## Resources

- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **OpenAI API Docs**: https://platform.openai.com/docs
- **LangChain** (for advanced orchestration): https://python.langchain.com/
- **Tenacity** (retry library): https://tenacity.readthedocs.io/

Good luck! 🚀
