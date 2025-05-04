import { combineReducers } from 'redux';
import authReducer from './auth/reducer';
import tasksReducer from './tasks/reducer';
import condaReducer from './conda/reducer';
import gitReducer from './git/reducer';

const rootReducer = combineReducers({
    auth: authReducer,
    tasks: tasksReducer,
    conda: condaReducer,
    git: gitReducer,
});

export default rootReducer;