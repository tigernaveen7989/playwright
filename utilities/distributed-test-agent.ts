#!/usr/bin/env node
/**
 * Distributed Test Agent Manager
 * Coordinates test execution across multiple agents/workers
 */

import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

interface AgentConfig {
  id: string;
  projects: string[];
  parallel: boolean;
  maxRetries: number;
}

class TestAgentManager {
  private agents: AgentConfig[] = [
    {
      id: 'agent-1',
      projects: ['call-center'],
      parallel: false,
      maxRetries: 2
    },
    {
      id: 'agent-2', 
      projects: ['xml-api', 'json-api'],
      parallel: true,
      maxRetries: 1
    }
  ];

  async runDistributedTests(): Promise<void> {
    console.log('🚀 Starting distributed test execution...');
    
    const promises = this.agents.map(agent => this.runAgentTests(agent));
    
    try {
      const results = await Promise.allSettled(promises);
      this.reportResults(results);
    } catch (error) {
      console.error('❌ Distributed test execution failed:', error);
      process.exit(1);
    }
  }

  private async runAgentTests(agent: AgentConfig): Promise<void> {
    console.log(`📊 Agent ${agent.id} starting tests for projects: ${agent.projects.join(', ')}`);
    
    for (const project of agent.projects) {
      let retries = 0;
      
      while (retries <= agent.maxRetries) {
        try {
          await this.executeTest(agent.id, project);
          console.log(`✅ Agent ${agent.id} completed ${project} successfully`);
          break;
        } catch (error) {
          retries++;
          if (retries <= agent.maxRetries) {
            console.log(`⚠️  Agent ${agent.id} retrying ${project} (attempt ${retries}/${agent.maxRetries})`);
            await this.delay(5000); // Wait 5 seconds before retry
          } else {
            console.error(`❌ Agent ${agent.id} failed ${project} after ${agent.maxRetries} retries`);
            throw error;
          }
        }
      }
    }
  }

  private executeTest(agentId: string, project: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const logDir = path.join('logs', agentId);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      const logFile = path.join(logDir, `${project}-${Date.now()}.log`);
      const logStream = fs.createWriteStream(logFile);

      const child = spawn('npx', ['playwright', 'test', '--project', project], {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PLAYWRIGHT_AGENT_ID: agentId,
          PLAYWRIGHT_PROJECT: project
        }
      });

      child.stdout?.pipe(logStream);
      child.stderr?.pipe(logStream);

      child.on('close', (code) => {
        logStream.end();
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Test execution failed with code ${code}`));
        }
      });

      child.on('error', (error) => {
        logStream.end();
        reject(error);
      });
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private reportResults(results: PromiseSettledResult<void>[]): void {
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log('\n📋 Distributed Test Execution Summary:');
    console.log(`✅ Successful agents: ${successful}`);
    console.log(`❌ Failed agents: ${failed}`);
    console.log(`📊 Total agents: ${results.length}`);
    
    if (failed > 0) {
      console.log('\n❌ Failed agent details:');
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.log(`  Agent ${this.agents[index].id}: ${result.reason}`);
        }
      });
      process.exit(1);
    }
    
    console.log('\n🎉 All agents completed successfully!');
  }
}

// Run if called directly
if (require.main === module) {
  const manager = new TestAgentManager();
  manager.runDistributedTests().catch(console.error);
}

export { TestAgentManager };