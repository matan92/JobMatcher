# scripts/clean_duplicates.py
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient


async def find_and_clean_duplicates():
    """Find and remove duplicate email addresses in candidates collection."""

    # Connect to MongoDB
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["jobmatcher"]

    print("🔍 Searching for duplicate emails...\n")

    # Find duplicate emails
    pipeline = [
        {"$match": {"email": {"$ne": None, "$ne": ""}}},
        {"$group": {
            "_id": "$email",
            "count": {"$sum": 1},
            "ids": {"$push": "$_id"},
            "names": {"$push": "$name"}
        }},
        {"$match": {"count": {"$gt": 1}}}
    ]

    duplicates = await db.candidates.aggregate(pipeline).to_list(None)

    if not duplicates:
        print("✅ No duplicate emails found!")
        return

    print(f"⚠️  Found {len(duplicates)} duplicate email(s):\n")

    for dup in duplicates:
        print(f"📧 Email: {dup['_id']}")
        print(f"   Count: {dup['count']} candidates")
        print(f"   Names: {', '.join(dup['names'])}")
        print(f"   IDs: {[str(id) for id in dup['ids']]}\n")

    # Ask for confirmation
    response = input("Do you want to delete duplicates (keep first, delete rest)? (y/n): ")

    if response.lower() == 'y':
        total_deleted = 0
        for dup in duplicates:
            ids_to_delete = dup['ids'][1:]  # Keep first, delete rest
            if ids_to_delete:
                result = await db.candidates.delete_many({"_id": {"$in": ids_to_delete}})
                deleted_count = result.deleted_count
                total_deleted += deleted_count
                print(f"✅ Deleted {deleted_count} duplicate(s) for {dup['_id']}")

        print(f"\n🎉 Total deleted: {total_deleted} candidate(s)")
    else:
        print("❌ Cancelled. No changes made.")

    client.close()


if __name__ == "__main__":
    asyncio.run(find_and_clean_duplicates())