/**
 * Simple Xata Helloworld Test
 * 
 * Tests creating a database and a simple record using the Xata REST API.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fetch } from 'undici';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function runTest() {
  try {
    console.log('Testing Xata API...');
    
    // Get Xata credentials from environment variables
    const apiKey = process.env.XATA_API_KEY;
    
    if (!apiKey) {
      throw new Error('XATA_API_KEY is required in .env.local file');
    }
    
    // First, let's list all workspaces to find the correct one
    console.log('Listing all workspaces...');
    const workspacesResponse = await fetch('https://api.xata.io/workspaces', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (!workspacesResponse.ok) {
      throw new Error(`Failed to list workspaces: ${workspacesResponse.status} ${workspacesResponse.statusText}`);
    }
    
    const workspacesData = await workspacesResponse.json();
    console.log('Available workspaces:', JSON.stringify(workspacesData, null, 2));
    
    if (!workspacesData.workspaces || workspacesData.workspaces.length === 0) {
      throw new Error('No workspaces found');
    }
    
    // Find the workspace that matches our slug
    const targetSlug = process.env.XATA_WORKSPACE_SLUG;
    const workspace = workspacesData.workspaces.find(ws => 
      ws.slug === targetSlug || ws.name === targetSlug
    );
    
    if (!workspace) {
      throw new Error(`Workspace with slug/name "${targetSlug}" not found`);
    }
    
    console.log(`Found workspace: ID=${workspace.id}, Name=${workspace.name}, Slug=${workspace.slug}`);
    
    // Create a new database in the workspace using PUT
    console.log('Creating a new database in Xata...');
    const databaseName = 'helloworld';
    const region = 'us-east-1';
    
    const createDatabaseResponse = await fetch(`https://api.xata.io/workspaces/${workspace.id}/dbs/${databaseName}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        region: region
      })
    });
    
    // Check response
    let createDbResponseText = await createDatabaseResponse.text();
    let createDbResponseData;
    try {
      createDbResponseData = JSON.parse(createDbResponseText);
    } catch (e) {
      createDbResponseData = createDbResponseText;
    }
    
    if (!createDatabaseResponse.ok) {
      if (createDbResponseText.includes('already exists')) {
        console.log(`Database '${databaseName}' already exists.`);
      } else {
        throw new Error(`Failed to create database: ${createDatabaseResponse.status} ${createDatabaseResponse.statusText} - ${JSON.stringify(createDbResponseData)}`);
      }
    } else {
      console.log('Database created successfully:', JSON.stringify(createDbResponseData, null, 2));
    }
    
    // Create URL for the workspace-specific API
    const branch = 'main';
    const workspaceUrl = `https://${workspace.slug}-${workspace.unique_id}.${region}.xata.sh`;
    
    // Create a simple table in the database
    console.log('Creating a simple table...');
    const createTableResponse = await fetch(`${workspaceUrl}/db/${databaseName}:${branch}/tables/posts`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({})
    });
    
    // Check response 
    let createTableResponseText = await createTableResponse.text();
    let createTableResponseData;
    try {
      createTableResponseData = JSON.parse(createTableResponseText);
    } catch (e) {
      createTableResponseData = createTableResponseText;
    }
    
    if (!createTableResponse.ok) {
      console.error(`Failed to create table: ${createTableResponse.status} ${createTableResponse.statusText} - ${JSON.stringify(createTableResponseData)}`);
    } else {
      console.log('Table created successfully:', JSON.stringify(createTableResponseData, null, 2));
    }
    
    // Add columns to the table one by one
    console.log('Adding title column...');
    const addTitleColumnResponse = await fetch(`${workspaceUrl}/db/${databaseName}:${branch}/tables/posts/columns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        name: 'title',
        type: 'text'
      })
    });
    
    if (addTitleColumnResponse.ok) {
      console.log('Title column added successfully');
    } else {
      const errorText = await addTitleColumnResponse.text();
      console.error(`Failed to add title column: ${errorText}`);
    }
    
    console.log('Adding content column...');
    const addContentColumnResponse = await fetch(`${workspaceUrl}/db/${databaseName}:${branch}/tables/posts/columns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        name: 'content',
        type: 'text'
      })
    });
    
    if (addContentColumnResponse.ok) {
      console.log('Content column added successfully');
    } else {
      const errorText = await addContentColumnResponse.text();
      console.error(`Failed to add content column: ${errorText}`);
    }
    
    // Insert a record into the table
    console.log('Inserting a record into the table...');
    const insertRecordResponse = await fetch(`${workspaceUrl}/db/${databaseName}:${branch}/tables/posts/data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        title: 'Hello World',
        content: 'This is my first Xata post!'
      })
    });
    
    // Check response
    const insertRecordResponseText = await insertRecordResponse.text();
    let insertRecordResponseData;
    try {
      insertRecordResponseData = JSON.parse(insertRecordResponseText);
    } catch (e) {
      insertRecordResponseData = insertRecordResponseText;
    }
    
    if (!insertRecordResponse.ok) {
      console.error(`Failed to insert record: ${insertRecordResponse.status} ${insertRecordResponse.statusText} - ${JSON.stringify(insertRecordResponseData)}`);
    } else {
      console.log('Record inserted successfully:', JSON.stringify(insertRecordResponseData, null, 2));
    }
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
runTest(); 