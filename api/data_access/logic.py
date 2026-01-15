from data_access.access import DB
import re

class Logic:
    def __init__(self):
        self.db = DB()

    def insert(self, model):
        collection_name = self.get_collection_name(model.__class__.__name__)
        data = model.dict()
        try:
            self.db.connect()
            insert_id = self.db.insert_one(collection_name, data)
            self.db.close()
            return str(insert_id)

        except Exception as e:
            print(f"Error inserting data into {collection_name}: {e}")
            self.db.close()
            return None
        
    def get(self, modelName):
        collection_name = self.get_collection_name(modelName)
        try:
            self.db.connect()
            collection = self.db.get_collection(collection_name)
            documents = self.map_db_id_to_model_id(list(collection.find()))
            self.db.close()
            return documents
        except Exception as e:
            print(f"Error retrieving data from {collection_name}: {e}")
            self.db.close()
            return None
    
    def get_by_query(self, modelName, query):
        collection_name = self.get_collection_name(modelName)
        try:
            self.db.connect()
            collection = self.db.get_collection(collection_name)
            documents = self.map_db_id_to_model_id(list(collection.find(query)))
            self.db.close()
            return documents
        
        except Exception as e:
            print(f"Error retrieving data from {collection_name} with query {query}: {e}")
            self.db.close()
            return None
    
    def update(self, modelName, query, update_data):
        collection_name = self.get_collection_name(modelName)
        try:
            self.db.connect()
            collection = self.db.get_collection(collection_name)
            result = collection.update_many(query, {'$set': update_data})
            self.db.close()
            return result.modified_count
        except Exception as e:
            print(f"Error updating data in {collection_name} with query {query}: {e}")
            self.db.close()
            return None
    
    def delete(self, modelName, query):
        collection_name = self.get_collection_name(modelName)
        try:
            self.db.connect()
            collection = self.db.get_collection(collection_name)
            result = collection.delete_many(query)
            self.db.close()
            return result.deleted_count
        except Exception as e:
            print(f"Error deleting data from {collection_name} with query {query}: {e}")
            self.db.close()
            return None
        
    def map_db_id_to_model_id(self, documents):
        for doc in documents:
            if '_id' in doc:
                doc['id'] = str(doc['_id'])
        return documents

    def get_collection_name(self, modelName):
        # Inserts an underscore before any uppercase letter not at the start
        s1 =re.sub('(.)([A-Z][a-z]+)', r'\1_\2', modelName)
        # Handles cases with consecutive uppercase letters (e.g., "HTTPHeader")
        return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).lower()
