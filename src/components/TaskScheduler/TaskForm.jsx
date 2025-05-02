import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
    CButton,
    CForm,
    CFormLabel,
    CFormInput,
    CFormSelect,
    CFormCheck,
    CFormText,
    CRow,
    CCol,
    CCard,
    CCardBody,
    CCardHeader,
    CModal,
    CModalHeader,
    CModalTitle,
    CModalBody,
    CModalFooter,
    CSpinner,
    CNav,
    CNavItem,
    CNavLink,
    CTabContent,
    CTabPane
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilMediaPlay, cilInfo } from '@coreui/icons';
import { isValidCron, cronToHumanReadable, getNextRunTime } from './CronHelpers';

const TaskForm = ({ environments, onSubmit, loading }) => {
    const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm({
        defaultValues: {
            taskName: '',
            condaEnv: '',
            scriptPath: '',
            scheduleType: 'immediate',
            cronExpression: '',
            scheduledDate: '',
            scheduledTime: ''
        }
    });

    const [advancedVisible, setAdvancedVisible] = useState(false);
    const [activeScheduleTab, setActiveScheduleTab] = useState(1);

    // 监听scheduleType字段的变化
    const scheduleType = watch('scheduleType');
    const cronExpression = watch('cronExpression');

    // 自定义cron表达式相关状态
    const [cronValid, setCronValid] = useState(true);
    const [cronDescription, setCronDescription] = useState("");
    const [nextRunTime, setNextRunTime] = useState("");

    // 验证cron表达式并更新描述
    useEffect(() => {
        if (cronExpression) {
            const valid = isValidCron(cronExpression);
            setCronValid(valid);

            if (valid) {
                setCronDescription(cronToHumanReadable(cronExpression));
                setNextRunTime(getNextRunTime(cronExpression));
            } else {
                setCronDescription("无效的cron表达式");
                setNextRunTime("无法预测");
            }
        } else {
            setCronValid(true);
            setCronDescription("");
            setNextRunTime("");
        }
    }, [cronExpression]);

    const handleFormSubmit = (data) => {
        onSubmit(data);
        reset();
    };

    // 预设的常用cron表达式
    const commonCronPatterns = [
        { label: '每分钟', value: '* * * * *' },
        { label: '每小时', value: '0 * * * *' },
        { label: '每天0点', value: '0 0 * * *' },
        { label: '每天8点', value: '0 8 * * *' },
        { label: '每周一8点', value: '0 8 * * 1' },
        { label: '每月1号0点', value: '0 0 1 * *' }
    ];

    // 设置预设的cron表达式并切换到编辑选项卡
    const setPresetCron = (cronValue) => {
        // 先确保值是有效的，避免错误提示
        setCronValid(true);
        setCronDescription(cronToHumanReadable(cronValue));
        setNextRunTime(getNextRunTime(cronValue));

        // 然后设置值并切换到编辑选项卡
        setValue('cronExpression', cronValue);
        setActiveScheduleTab(1); // 自动切换到编辑选项卡
    };

    return (
        <>
            <CCard className="mb-4">
                <CCardHeader>
                    <h5 className="mb-0">创建新任务</h5>
                </CCardHeader>
                <CCardBody>
                    <CForm onSubmit={handleSubmit(handleFormSubmit)}>
                        <CRow>
                            <CCol md={6}>
                                <div className="mb-3">
                                    <CFormLabel htmlFor="taskName">任务名称</CFormLabel>
                                    <CFormInput
                                        type="text"
                                        id="taskName"
                                        {...register('taskName', { required: true })}
                                    />
                                    {errors.taskName && <span className="text-danger">任务名称是必填项</span>}
                                </div>
                            </CCol>
                            <CCol md={6}>
                                <div className="mb-3">
                                    <CFormLabel htmlFor="condaEnv">Conda环境</CFormLabel>
                                    <CFormSelect
                                        id="condaEnv"
                                        {...register('condaEnv', { required: true })}
                                    >
                                        <option value="">选择环境</option>
                                        {environments.map(env => (
                                            <option key={env.name} value={env.name}>{env.name}</option>
                                        ))}
                                    </CFormSelect>
                                    {errors.condaEnv && <span className="text-danger">Conda环境是必填项</span>}
                                </div>
                            </CCol>
                        </CRow>
                        <div className="mb-3">
                            <CFormLabel htmlFor="scriptPath">脚本路径</CFormLabel>
                            <CFormInput
                                type="text"
                                id="scriptPath"
                                {...register('scriptPath', { required: true })}
                                placeholder="例如: /path/to/script.py"
                            />
                            {errors.scriptPath && <span className="text-danger">脚本路径是必填项</span>}
                        </div>

                        <div className="mb-3">
                            <CFormLabel>执行方式</CFormLabel>
                            <div className="mt-2">
                                <CFormCheck
                                    type="radio"
                                    name="scheduleType"
                                    id="scheduleImmediate"
                                    label="立即执行"
                                    value="immediate"
                                    checked={scheduleType === 'immediate'}
                                    onChange={() => setValue('scheduleType', 'immediate')}
                                />
                                <CFormCheck
                                    type="radio"
                                    name="scheduleType"
                                    id="scheduleOnce"
                                    label="定时执行（一次）"
                                    value="once"
                                    checked={scheduleType === 'once'}
                                    onChange={() => setValue('scheduleType', 'once')}
                                    className="mt-2"
                                />
                                <CFormCheck
                                    type="radio"
                                    name="scheduleType"
                                    id="scheduleCron"
                                    label="高级调度（Cron表达式）"
                                    value="cron"
                                    checked={scheduleType === 'cron'}
                                    onChange={() => setValue('scheduleType', 'cron')}
                                    className="mt-2"
                                />
                            </div>
                        </div>

                        {scheduleType === 'once' && (
                            <CRow>
                                <CCol md={6}>
                                    <div className="mb-3">
                                        <CFormLabel htmlFor="scheduledDate">执行日期</CFormLabel>
                                        <CFormInput
                                            type="date"
                                            id="scheduledDate"
                                            {...register('scheduledDate', { required: scheduleType === 'once' })}
                                        />
                                        {errors.scheduledDate && <span className="text-danger">执行日期是必填项</span>}
                                    </div>
                                </CCol>
                                <CCol md={6}>
                                    <div className="mb-3">
                                        <CFormLabel htmlFor="scheduledTime">执行时间</CFormLabel>
                                        <CFormInput
                                            type="time"
                                            id="scheduledTime"
                                            {...register('scheduledTime', { required: scheduleType === 'once' })}
                                        />
                                        {errors.scheduledTime && <span className="text-danger">执行时间是必填项</span>}
                                    </div>
                                </CCol>
                            </CRow>
                        )}

                        {scheduleType === 'cron' && (
                            <div className="mb-3">
                                <CNav variant="tabs" role="tablist" className="mb-3">
                                    <CNavItem>
                                        <CNavLink
                                            active={activeScheduleTab === 1}
                                            onClick={() => setActiveScheduleTab(1)}
                                        >
                                            输入表达式
                                        </CNavLink>
                                    </CNavItem>
                                    <CNavItem>
                                        <CNavLink
                                            active={activeScheduleTab === 2}
                                            onClick={() => setActiveScheduleTab(2)}
                                        >
                                            常用表达式
                                        </CNavLink>
                                    </CNavItem>
                                </CNav>
                                <CTabContent>
                                    <CTabPane role="tabpanel" visible={activeScheduleTab === 1}>
                                        <CFormLabel htmlFor="cronExpression">Cron表达式</CFormLabel>
                                        <CFormInput
                                            type="text"
                                            id="cronExpression"
                                            {...register('cronExpression', {
                                                required: scheduleType === 'cron',
                                                validate: value => scheduleType !== 'cron' || isValidCron(value) || "请输入有效的cron表达式"
                                            })}
                                            placeholder="分 时 日 月 周 (例如: 0 8 * * 1-5)"
                                            className={!cronValid && cronExpression ? "is-invalid" : ""}
                                        />
                                        {errors.cronExpression && <span className="text-danger">{errors.cronExpression.message}</span>}
                                        <CFormText>
                                            格式: 分钟 小时 日 月 周 (0-59 0-23 1-31 1-12 0-6)
                                        </CFormText>

                                        {cronExpression && (
                                            <div className="mt-3">
                                                <div className={`p-3 rounded ${cronValid ? 'bg-light' : 'bg-danger bg-opacity-10'}`}>
                                                    <div className="mb-2">
                                                        <strong>表达式含义: </strong>
                                                        <span>{cronDescription}</span>
                                                    </div>
                                                    {cronValid && (
                                                        <div>
                                                            <strong>下次执行: </strong>
                                                            <span>{nextRunTime}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </CTabPane>
                                    <CTabPane role="tabpanel" visible={activeScheduleTab === 2}>
                                        <div className="mb-3">
                                            <CFormLabel>选择常用表达式</CFormLabel>
                                            <div className="row g-3 mt-2">
                                                {commonCronPatterns.map((pattern, index) => (
                                                    <div className="col-md-4" key={index}>
                                                        <div
                                                            className="d-flex align-items-center p-2 border rounded cursor-pointer"
                                                            onClick={() => setPresetCron(pattern.value)}
                                                            style={{ cursor: 'pointer' }}
                                                        >
                                                            <div>
                                                                <div className="fw-bold">{pattern.label}</div>
                                                                <small className="text-muted">{pattern.value}</small>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="alert alert-info d-flex align-items-center" role="alert">
                                            <CIcon icon={cilInfo} className="flex-shrink-0 me-2" />
                                            <div>
                                                选择后会自动填入到表达式输入框，您也可以进一步修改
                                            </div>
                                        </div>
                                    </CTabPane>
                                </CTabContent>
                            </div>
                        )}

                        <div className="mt-3 mb-3">
                            <CButton color="secondary" type="button" onClick={() => setAdvancedVisible(true)} className="me-2">
                                高级选项
                            </CButton>
                            <CButton color="primary" type="submit" disabled={loading}>
                                {loading ? <CSpinner size="sm" /> : (
                                    <>
                                        <CIcon icon={cilMediaPlay} className="me-2" />
                                        创建任务
                                    </>
                                )}
                            </CButton>
                        </div>
                    </CForm>
                </CCardBody>
            </CCard>

            {/* 高级选项模态框 */}
            <CModal visible={advancedVisible} onClose={() => setAdvancedVisible(false)}>
                <CModalHeader>
                    <CModalTitle>任务高级选项</CModalTitle>
                </CModalHeader>
                <CModalBody>
                    <div className="mb-3">
                        <CFormLabel>任务优先级</CFormLabel>
                        <CFormSelect>
                            <option value="normal">正常</option>
                            <option value="high">高</option>
                            <option value="low">低</option>
                        </CFormSelect>
                    </div>
                    <div className="mb-3">
                        <CFormLabel>内存限制 (MB)</CFormLabel>
                        <CFormInput type="number" placeholder="不限制请留空" />
                    </div>
                    <div className="mb-3">
                        <CFormLabel>失败重试次数</CFormLabel>
                        <CFormInput type="number" min="0" max="3" defaultValue="0" />
                    </div>
                    <div className="mb-3">
                        <CFormLabel>超时时间 (分钟)</CFormLabel>
                        <CFormInput type="number" min="0" placeholder="0 表示不限制" defaultValue="0" />
                    </div>
                    <div className="mb-3">
                        <CFormLabel>环境变量</CFormLabel>
                        <CFormInput type="text" placeholder="KEY=VALUE,KEY2=VALUE2" />
                    </div>
                </CModalBody>
                <CModalFooter>
                    <CButton color="secondary" onClick={() => setAdvancedVisible(false)}>
                        取消
                    </CButton>
                    <CButton color="primary" onClick={() => setAdvancedVisible(false)}>
                        确定
                    </CButton>
                </CModalFooter>
            </CModal>
        </>
    );
};

export default TaskForm;