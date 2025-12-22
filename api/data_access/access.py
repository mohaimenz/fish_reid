from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

class DB():
    """
    Database connection class for MongoDB.
    """

    def __init__(self, uri="mongodb://localhost:27017/", db_name="fish_reid"):
        self.conn_uri = uri
        self.db_name = db_name
        self.client = None
        self.db = None

    def connect(self):
        try:
            self.client = MongoClient(self.conn_uri)
            self.client.admin.command('ping')  # Check connection
            self.db = self.client[self.db_name]
            print("MongoDB connected successfully!")
        except ConnectionFailure as e:
            self.client = None
            self.db = None
            print(f"Could not connect to MongoDB: {e}")
            raise

    def close(self):
        if self.client:
            self.client.close()
            print("MongoDB connection closed.")

    def insert_one(self, collection_name, data):
        """
        Inserts a single document into a specified collection.

        Args:
            collection_name: The name of the collection to insert into.
            data: A dictionary containing the data to be inserted.

        Returns:
            The inserted document's ID.
        """
        try:
            collection = self.db[collection_name]
            result = collection.insert_one(data)
            return result.inserted_id
        except Exception as e:
            print(f"Error inserting document into {collection_name}: {e}")
            return None
        
    def get_collection(self, collection_name):
        """
        Retrieves a collection from the database.

        Args:
            collection_name: The name of the collection to retrieve.

        Returns:
            The requested collection.
        """
        try:    
            return self.db[collection_name]
        except Exception as e:
            print(f"Error retrieving collection {collection_name}: {e}")    
            return None

    def find_one(self, collection_name, id):
        if self.db:
            collection = self.db[collection_name]
            return collection.find_one({"id": id})
        return None
    
    def find_active(self, collection_name):
        if self.db:
            collection = self.db[collection_name]
            return collection.find({"is_active": True})
        return None
