from azure.identity import DefaultAzureCredential
import psycopg2

def get_connection():
    credential = DefaultAzureCredential()

    token = credential.get_token(
        "https://ossrdbms-aad.database.windows.net/.default"
    ).token

    return psycopg2.connect(
        host="docsmart-postgres.postgres.database.azure.com",
        dbname="docsmartdb",
        user="docsmart-backend",   #Entra DB role
        password=token,            #token replaces password
        sslmode="require"
    )