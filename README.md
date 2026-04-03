# Crete Valley DSS

Crete Valley DSS is a decision support system focused on the creation, evaluation and resolution of decision-making issues with multiple alternatives, criteria and expert participation.

The platform supports workflows with or without consensus and allows administrators to define decision problems, assign experts, configure evaluation domains and resolve issues using different decision models.

## Main features

- User authentication and account management
- Issue creation and administration
- Alternatives and hierarchical criteria definition
- Expert assignment and participation tracking
- Support for direct and pairwise evaluation structures
- Criteria weight elicitation
- Alternative evaluation by experts
- Optional consensus-based workflows
- Issue resolution through external model execution
- Scenario generation for issues
- Notifications and administrative management

## Monorepo structure

This project is organized as a monorepo with three main applications:

- `Frontend/`: React + MUI client application
- `Backend/`: Node.js + Express API
- `ApiModels/`: Python + FastAPI service for decision model execution

## Main stack

### Frontend
- React
- Material UI

### Backend
- Node.js
- Express
- MongoDB
- Mongoose
- JWT authentication

### Model execution service
- Python
- FastAPI

## High-level architecture

The platform is divided into:

- a frontend client that manages the user interface and consumes the API
- a backend API that handles authentication, persistence, workflows and orchestration
- an external model service that executes decision-making models and returns results

The backend follows a modular structure with separate areas for controllers, domain modules, models, routes, middlewares, services and shared utilities.

## Core domain

The central concept of the platform is the **issue**.

An issue represents a decision problem and includes:

- an administrator
- a decision model
- alternatives
- a criteria tree
- experts
- expression domains
- evaluations
- weight inputs
- consensus phases when enabled
- resolution results and scenarios

## Supported decision models

The platform is designed to support different decision-making models, including:

- TOPSIS
- ARAS
- BORDA
- Fuzzy TOPSIS
- Herrera-Viedma CRP

## Project structure

```text
Frontend/
Backend/
ApiModels/