import uiautomator2 as u2
import time
import re

d = u2.connect("RF8Y10AWLYY")
d.app_start("com.whatsapp.w4b", stop=True)
time.sleep(4)

xml = d.dump_hierarchy()

# Find all resource IDs containing keywords related to chat names
ids = set(re.findall(r'resource-id="([^"]*)"', xml))
print("=== All resource IDs ===")
for i in sorted(ids):
    if any(k in i.lower() for k in ["row", "chat", "conv", "contact", "name", "title", "list"]):
        print(i)

print("\n=== All visible texts (first 30) ===")
texts = re.findall(r'text="([^"]{2,40})"', xml)
for t in texts[:30]:
    print(t)
