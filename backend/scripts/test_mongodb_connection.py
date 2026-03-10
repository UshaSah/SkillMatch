#!/usr/bin/env python3
"""
MongoDB Connection Tester
Tests MongoDB Atlas connection and validates connection string format.
"""

import sys
import socket
import re
from urllib.parse import urlparse, parse_qs
from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError, ConfigurationError

def validate_uri_format(uri):
    """Validate MongoDB URI format."""
    issues = []
    
    # Check if it's a valid URI
    if not uri.startswith(('mongodb://', 'mongodb+srv://')):
        issues.append("❌ URI must start with 'mongodb://' or 'mongodb+srv://'")
        return False, issues
    
    # Parse URI
    try:
        parsed = urlparse(uri)
    except Exception as e:
        issues.append(f"❌ Failed to parse URI: {e}")
        return False, issues
    
    # Check for SRV format
    if uri.startswith('mongodb+srv://'):
        issues.append("⚠️  Using SRV format - requires DNS resolution")
        issues.append("   Consider using standard mongodb:// format for ECS")
    
    # Check for required components
    if not parsed.netloc:
        issues.append("❌ Missing host information")
        return False, issues
    
    # Extract hosts
    hosts = parsed.netloc.split('@')[-1].split('/')[0]
    if '@' in parsed.netloc:
        auth_part = parsed.netloc.split('@')[0]
        if ':' not in auth_part:
            issues.append("⚠️  Missing password in authentication")
    
    # Check query parameters (only for standard format)
    if not uri.startswith('mongodb+srv://'):
        query_params = parse_qs(parsed.query)
        required_params = ['ssl', 'authSource', 'replicaSet']
        
        for param in required_params:
            if param not in query_params:
                issues.append(f"⚠️  Missing recommended parameter: {param}")
        
        if 'ssl' in query_params and query_params['ssl'][0].lower() != 'true':
            issues.append("⚠️  SSL should be enabled for Atlas (ssl=true)")
    else:
        # SRV format - check if database name is in path
        if not parsed.path or parsed.path == '/':
            issues.append("⚠️  SRV format: Add database name to path (e.g., /skillmatch-1)")
    
    return True, issues

def test_network_connectivity(uri):
    """Test network connectivity to MongoDB hosts."""
    results = []
    
    # Extract hosts from URI
    if uri.startswith('mongodb+srv://'):
        # SRV format - extract domain and test DNS resolution
        match = re.search(r'@([^/]+)', uri)
        if match:
            domain = match.group(1)
            results.append(f"ℹ️  SRV format detected: {domain}")
            try:
                # Try to resolve the SRV domain
                ip_address = socket.gethostbyname(domain)
                results.append(f"✅ DNS resolution successful: {domain} → {ip_address}")
                results.append("   Note: SRV will resolve to multiple hosts automatically")
            except socket.gaierror as e:
                results.append(f"❌ DNS resolution failed for {domain}: {e}")
            except Exception as e:
                results.append(f"❌ Error resolving {domain}: {e}")
        return results
    else:
        # Standard format - extract hosts
        match = re.search(r'@([^/]+)', uri)
        if match:
            hosts_str = match.group(1)
            hosts = hosts_str.split(',')
            
            for host in hosts:
                hostname = host.split(':')[0]
                port = int(host.split(':')[1]) if ':' in host else 27017
                
                try:
                    # Try DNS resolution first
                    ip_address = socket.gethostbyname(hostname)
                    results.append(f"   DNS: {hostname} → {ip_address}")
                    
                    # Then test TCP connection
                    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    sock.settimeout(5)
                    result = sock.connect_ex((hostname, port))
                    sock.close()
                    
                    if result == 0:
                        results.append(f"✅ {hostname}:{port} - Reachable")
                    else:
                        results.append(f"❌ {hostname}:{port} - Not reachable (connection refused)")
                except socket.gaierror as e:
                    results.append(f"❌ {hostname}:{port} - DNS resolution failed: {e}")
                except Exception as e:
                    results.append(f"❌ {hostname}:{port} - Error: {e}")
        else:
            results.append("⚠️  Could not extract hosts from URI")
    
    return results

def test_mongodb_connection(uri):
    """Test actual MongoDB connection."""
    try:
        # Mask password in URI for logging
        masked_uri = re.sub(r':([^:@]+)@', ':****@', uri)
        print(f"\n🔌 Testing MongoDB connection...")
        print(f"   URI: {masked_uri[:80]}...")
        
        client = MongoClient(uri, serverSelectionTimeoutMS=10000)
        
        # Try to connect
        client.admin.command('ping')
        
        # Get server info
        server_info = client.server_info()
        print(f"\n✅ Connection successful!")
        print(f"   MongoDB version: {server_info.get('version', 'unknown')}")
        print(f"   Server: {client.address}")
        
        # List databases
        db_names = client.list_database_names()
        print(f"   Available databases: {', '.join(db_names[:5])}")
        if len(db_names) > 5:
            print(f"   ... and {len(db_names) - 5} more")
        
        client.close()
        return True, None
        
    except ServerSelectionTimeoutError as e:
        error_msg = str(e)
        print(f"\n   Full error details:")
        print(f"   {error_msg[:300]}")
        if hasattr(e, 'details'):
            print(f"   Details: {e.details}")
        
        # Check for DNS resolution failure first
        if "nodename" in error_msg.lower() or "servname" in error_msg.lower() or "not known" in error_msg.lower():
            return False, "❌ DNS resolution failed - hostnames cannot be resolved. Check if connection string hostnames are correct."
        
        # Check for IP whitelisting
        if "whitelist" in error_msg.lower() or ("ip" in error_msg.lower() and "not" in error_msg.lower()):
            return False, "❌ IP whitelisting issue - check MongoDB Atlas Network Access"
        
        return False, f"❌ Server selection timeout: {error_msg[:150]}"
    except ConfigurationError as e:
        return False, f"❌ Configuration error: {e}"
    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        print(f"\n   Error type: {error_type}")
        print(f"   Full error: {error_msg[:300]}")
        return False, f"❌ Connection failed ({error_type}): {error_msg[:150]}"

def main():
    if len(sys.argv) < 2:
        print("Usage: python test_mongodb_connection.py <MONGODB_URI>")
        print("\nExample:")
        print('  python test_mongodb_connection.py "mongodb://user:pass@host1:27017,host2:27017/db?ssl=true&authSource=admin"')
        sys.exit(1)
    
    uri = sys.argv[1]
    
    print("=" * 70)
    print("MongoDB Connection Tester")
    print("=" * 70)
    
    # Step 1: Validate URI format
    print("\n📋 Step 1: Validating URI format...")
    is_valid, issues = validate_uri_format(uri)
    for issue in issues:
        print(f"   {issue}")
    
    if not is_valid:
        print("\n❌ URI format validation failed. Please fix the URI and try again.")
        sys.exit(1)
    
    # Step 2: Test network connectivity
    print("\n🌐 Step 2: Testing network connectivity...")
    network_results = test_network_connectivity(uri)
    for result in network_results:
        print(f"   {result}")
    
    # Step 3: Test MongoDB connection
    success, error = test_mongodb_connection(uri)
    
    if success:
        print("\n" + "=" * 70)
        print("✅ All tests passed! MongoDB connection is working.")
        print("=" * 70)
        sys.exit(0)
    else:
        print(f"\n   {error}")
        print("\n" + "=" * 70)
        print("❌ Connection test failed. Check the error above.")
        print("=" * 70)
        print("\nCommon issues:")
        print("  1. IP not whitelisted in MongoDB Atlas Network Access")
        print("  2. Incorrect username/password")
        print("  3. Wrong connection string format")
        print("  4. Network/firewall blocking connections")
        sys.exit(1)

if __name__ == "__main__":
    main()
