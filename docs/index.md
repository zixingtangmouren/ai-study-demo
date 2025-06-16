## CommonTableWithFilter 使用案例

### 配置初始化

通过`IftActions`在全局可以设置 axios 请求、枚举、字典等基础配置。使用方式与表单的一致。

```jsx
import React from 'react';
import axios from 'axios';
import { IftActions } from '@cccc/mes-base';
window.globalUrl = {
  wmsBiz: 'http://wms-admin-fat.gz.cccc.cn/biz',
  mfg: 'https://mfg-bsm-test-api.gz.cccc.cn',
  wmsInv: '//wms-admin-fat.gz.cccc.cn/inv',
};
const axiosConfig = {
  requestInterceptors: (config) => {
    // 工厂请求config增加token
    if (/.*config\.gz\.cccc\.cn|smes-mdprod\.cccc\.com/.test(config.url)) {
      config.headers.common.cmes_info = window.__CMES_INFO_TOKEN__;
    }
    return {
      ...config,
    };
  },
  responseInterceptors: (response) => {
    const { data = {}, status, config } = response;
    const {
      success,
      Succeed,
      status: dataStatus,
      Message: dataErrorMessage,
      result,
      data: dataResult,
      error = {},
      message,
    } = data;
    // 1、有success，根据success来判断是否成功
    if (success === false) {
      // 有些接口特殊，错误信息放在Message里面
      if (Succeed === 0) {
      } else {
      }
      return Promise.reject(data);
    }
    // 2、有status，根据status来判断是否成功
    if (dataStatus && dataStatus !== '0') {
      return Promise.reject(data);
    }
    return result || dataResult;
  },
  responseInterceptorsError: (error) => {
    const {
      message: { data } = {},
      response: {
        status,
        message: errorMessage1,
        data: { message: errorMessage2, data: innerData, error: { message: errorMessage3 = '' } = {} } = {},
      } = {},
    } = error;
    if (axios.isCancel(error)) {
      return Promise.resolve(data);
    }
    // 如果没有的话 则是正常的接口错误 直接返回错误信息给用户
    if (status === 401) {
    } else if (status === 403) {
    } else {
      let errorMsg = errorMessage1 || errorMessage2 || errorMessage3 || '服务器返回异常，请联系管理员';
    }
    return Promise.reject(error);
  },
};

const enumConfig = {
  enumApiMap: {
    wmsBiz: {
      api: '/frontApi/wmsBiz/admin/v1/enum',
      // 枚举值
      itemValue: 'code',
      // 枚举值的翻译
      itemName: 'name',
    },
    // ....其他配置
  },
  // 指定默认的枚举接口类型，如果表单配置自己指定的可以覆盖这里全局配置的
  enumType: 'default',
  // 格式数据，传入一个值，要返回一个数组
  enumFormatData: (res) => res,
  // 全局配置的枚举对象数组
  enumList: {},
};

IftActions.init({
  axiosConfig,
  enumConfig,
});

export default () => {
  return <div>默认配置，一般在入口main声明</div>;
};
```

### 基础使用

`xioo-form` 与 `xioo-table` 与 `btnList的结合`。在最外层传入 name 后，通过 `IftActions`拿到表单表格的实例，此时的表单表格无需指定`name`与`dvProgNo`。

```tsx
import React, { useEffect, useState } from 'react';
import { Button, ConfigProvider, Switch } from 'antd';
import { CommonTableWithFilter, IftActions } from '@cccc/mes-base';
import { GlobalCommonContext, getAction } from '@cccc/mes-utils';
import type { ITableProps, IFilterFormProps, IBaseBtn } from '@cccc/mes-base/es/CommonTableWithFilter';
import zhCN from 'antd/lib/locale-provider/zh_CN';

export default () => {
  const [tableConfig, setTableConfig] = useState();
  const [loaded, setLoaded] = useState<boolean>(false);
  useEffect(() => {
    getAction(
      '/api/tableConfig/getConfig',
      { tableCode: 'COMMONTABLEWITHFILTER_DEMOS_BASEUSE' },
      (res: any) => {
        setTableConfig(res);
        setLoaded(true);
      },
      () => {
        setLoaded(true);
      }
    );
  }, []);

  const tableProps: ITableProps = {
    tableInfo: {
      autoLoad: true,
      rowKey: 'id',
      selectType: 'checkbox',
      columnAlign: 'center',
      columnsList: [
        {
          columnName: '检验类型',
          headerTooltip: '检验类型的说明',
          columnNo: 'typeCode',
          columnType: 'SearchSelect',
          columnDataUrl: '/frontApi/qmsProd/admin/basic/insp/type/list',
          itemValue: 'typeCode',
          itemName: 'typeName',
          defaultLabelKey: 'typeName',
          onSearchKeyWord: 'typeName',
          otherOptionValues: {
            typeName: 'typeName',
          },
          onSearchOtherParams: {
            inspType: 'PRODUCT',
          },
          width: 150,
          isEdit: true,
          rules: [{ required: true, message: '检验类型必填' }],
          isFilter: true,
          filterConfig: {
            name: 'typeCode',
            type: 'Input',
            filterToApi: true,
          },
        },
        {
          columnName: '工段',
          columnNo: 'stageCode',
          columnType: 'Dict',
          dictType: 'mfgDict',
          dictCode: 'MFG_QMS_BAS_PROCESS_STAGE',
          width: 150,
          isEdit: true,
        },
        {
          columnName: '检验标准名称',
          columnNo: 'tempName',
          required: true,
          columnType: 'Input',
          width: 200,
          isEdit: true,
          rules: [{ required: true, message: '检验标准名称必填' }],
        },
        {
          columnName: () => {
            return <div>版本名称</div>;
          },
          columnNo: 'version',
          columnNameAlias: '版本名称',
          isFilter: true,
          filterConfig: {
            name: 'version',
            type: 'Input',
            filterToApi: true,
          },
        },
        {
          columnName: '是否',
          columnNo: 'yesorno',
          width: 50,
          columnType: 'Select',
          itemName: 'itemNameDesc',
          itemValue: 'boolValue',
        },
        {
          columnName: '选择',
          columnNo: 'render',
          render: () => <Switch defaultChecked />,
          columnWidth: 100,
          flex: 1,
        },
        {
          columnName: '状态',
          columnNo: 'stdStatus',
          columnType: 'Enum',
          enumCode: 'ProcTemplateInspStdStatusEnum',
        },
      ],
      columnSelectOptions: {
        yesorno: [
          {
            itemName: 'YES',
            value: 'Y',
            itemNameDesc: '是',
            itemValue: '1',
            desc: '合格',
            key: true,
            boolValue: true,
            activeDesc: '有效',
            absoluteDesc: '活跃',
          },
          {
            itemName: 'NO',
            value: 'N',
            itemNameDesc: '否',
            itemValue: '0',
            desc: '不合格',
            key: false,
            boolValue: false,
            activeDesc: '失效',
            absoluteDesc: '作废',
          },
        ],
      },
    },
    customExportHandler: (p, cb) => {
      console.log(p);
      cb();
    },
    formatData: (res, cb) => {
      cb(
        (res.content || []).map((item: any) => ({
          ...item,
          yesorno: true,
        }))
      );
    },
    tableDescription: `
    单个表格的取值逻辑说明很长很长。。。单个表格的取值逻辑说明很长很长。。。
    单个表格的取值逻辑说明很长很长。。。单个表格的取值逻辑说明很长很长。。。
    单个表格的取值逻辑说明很长很长。。。单个表格的取值逻辑说明很长很长。。。
    单个表格的取值逻辑说明很长很长。。。单个表格的取值逻辑说明很长很长。。。
    单个表格的取值逻辑说明很长很长。。。单个表格的取值逻辑说明很长很长。。。`,
  };

  const formProps: IFilterFormProps = {
    fieldGroup: [
      {
        key: 'baseInfo',
        fields: [
          {
            label: '用户',
            placeholder: '输入用户名',
            type: 'Select',
            onSearchApi: '/frontApi/mfg/api/v1/mfg_user/all_user',
            name: 'account',
            itemName: 'name-account',
            itemValue: 'id',
            showSearch: true,
            onSearchKeyWord: 'keyword',
            // searchOnFocus: true,
            // cacheSearchResult: true,
            // otherOptionValues: {
            //   lotNo: 'lotNo'
            // }
          },
          {
            label: 'Reelid',
            placeholder: '输入Reelid模糊搜索',
            type: 'Select',
            onSearchApi: '/frontApi/wmsInv/admin/v1/item_onhand/list/bar/reel_id',
            name: 'reelId',
            itemName: 'name',
            itemValue: 'code',
            onSearchKeyWord: 'kw',
            searchOnFocus: true,
            cacheSearchResult: true,
          },
          {
            label: '状态',
            placeholder: '请选择状态',
            name: 'status',
            type: 'Dict',
            dictCode: 'WMS_INV_ONHAND_STATUS',
          },
          {
            label: '需求时间',
            type: 'RangePicker', // 时间区间选择器
            name: 'reqTime',
            startName: 'reqTimeStart', // 开始时间属性
            endName: 'reqTimeEnd', // 结束时间属性
            required: false,
            format: 'YYYY-MM-DD',
            isFormatToTimeStamp: false, // 是否使用时间戳传值，默认为true
          },
        ],
      },
    ],
    optionList: {},
    initialValues: {
      status: 'WMS_INV_ONHAND_STATUS_NOT_INSP',
      reelId: '1050622106700000923',
      reqTimeStart: new Date().getTime() - 7 * 24 * 60 * 60 * 1000,
      reqTimeEnd: new Date().getTime(),
    },
  };

  const filterProps = {
    searchApi: '/frontApi/qmsProd/admin/basic/proc/template/std/list',
  };

  const btnList: IBaseBtn[] = [
    {
      type: 'primary',
      text: '新增',
      key: 'add',
      disabled: false, // 禁用状态
      icon: null, // antd icon组件
      loading: false, // 加载中
      onClick: () => {
        IftActions.getTableWithFilter('base').table?.onAddRowItems([]);
      }, // 点击方法
    },
  ];

  const filterRadioGroup = [
    {
      options: (['AI', 'DIP', 'SMT', 'PKG', 'PCB', '其它'] || []).map((item) => {
        return {
          label: item,
          value: item,
        };
      }),
      defaultValue: 'AI',
      key: 'feeTypeTab',
    },
  ];

  return (
    <ConfigProvider locale={zhCN}>
      <GlobalCommonContext.Provider
        value={{
          userTableConfig: {
            COMMONTABLEWITHFILTER_DEMOS_BASEUSE: tableConfig,
          },
          isAdmin: true,
        }}
      >
        {loaded && (
          <CommonTableWithFilter
            name="COMMONTABLEWITHFILTER_DEMOS_BASEUSE"
            filterProps={filterProps}
            formProps={formProps}
            tableProps={tableProps}
            btnList={btnList}
            filterRadioGroup={filterRadioGroup}
          />
        )}
        <Button type="primary" onClick={() => console.log(IftActions.getTableWithFilter('base'))}>
          获取实例
        </Button>
      </GlobalCommonContext.Provider>
    </ConfigProvider>
  );
};
```

### 父子表格

`childTableProps`必须指定`title`，其余参数与单独使用参数一致

```tsx
import React from 'react';
import { CommonTableWithFilter, IftActions } from '@cccc/mes-base';
import type {
  ITableProps,
  IFilterFormProps,
  IBaseBtn,
  IChildTableProps,
} from '@cccc/mes-base/es/CommonTableWithFilter';

export default () => {
  const tableProps: ITableProps = {
    tableInfo: {
      rowKey: 'id',
      selectType: 'radio',
      columnAlign: 'center',
      columnsList: [
        {
          columnName: '规则编码',
          columnNo: 'ruleCode',
          isEdit: ({ data }) => {
            return !data.id;
          },
          rules: [{ required: true, message: '规则编码必填' }],
          flex: 1,
        },
        {
          columnName: '规则名称',
          columnNo: 'ruleName',
          isEdit: true,
          rules: [{ required: true, message: '规则名称必填' }],
          flex: 1,
        },
      ],
      onSelectionChanged: (rows) => {
        console.log(rows);
      },
    },
  };

  const formProps: IFilterFormProps = {
    fieldGroup: [
      {
        key: 'baseInfo',
        fields: [
          {
            label: '规则编码',
            name: 'ruleCode',
            type: 'Input',
          },
          {
            label: '规则名称',
            name: 'ruleName',
            type: 'Input',
          },
        ],
      },
    ],
    optionList: {},
    initialValues: {
      status: 'WMS_INV_ONHAND_STATUS_NOT_INSP',
    },
  };

  const filterProps = {
    searchApi: '/frontApi/qmsProd/admin/v1/level/transform/list',
  };

  const btnList: IBaseBtn[] = [
    {
      type: 'primary',
      text: '新增',
      key: 'add',
      disabled: false, // 禁用状态
      icon: null, // antd icon组件
      loading: false, // 加载中
      onClick: () => {
        IftActions.getTableWithFilter('parent').table?.onAddRowItems([]);
      }, // 点击方法
    },
    {
      text: '删除',
      key: 'delete',
      disabled: true,
      popconfirmProps: {
        // 使用气泡确认框
        title: '确定删除？', // 必填，确认文字提示,
        okText: '确认', // 确认按钮文字,
        cancelText: '取消', // 取消按钮文字
      },
    },
  ];

  const childTableProps: IChildTableProps[] = [
    {
      name: 'child1',
      tableProps: {
        title: '明细1',
        tableInfo: {
          rowKey: 'id',
          selectType: 'checkbox',
          columnAlign: 'center',
          columnsList: [
            {
              columnNo: 'isInitPhase',
              columnName: '是否初始阶段',
              columnType: 'Switch',
              isEdit: true,
              flex: 1,
            },
            {
              columnNo: 'phaseTransfer',
              columnName: '检验严格度转换',
              columnType: 'Dict',
              dictType: 'mfgProdDict',
              dictCode: 'MFG_QMS_BAS_VRC',
              isEdit: true,
              rules: [{ required: true, message: '检验严格度转换必填' }],
              flex: 1,
            },
            {
              columnNo: 'transformCondition',
              columnName: '规则条件',
              columnType: 'Dict',
              dictType: 'mfgProdDict',
              dictCode: 'MFG_QMS_BAS_VRC_RULES',
              isEdit: true,
              rules: [{ required: true, message: '规则条件必填' }],
              flex: 1,
            },
          ],
        },
      },
      fatherRowKeyToApi: true,
      filterProps: {
        searchApi: '/frontApi/qmsProd/admin/v1/level/transform/line',
      },
    },
    {
      name: 'child2',
      title: '明细2',
      component: (data) => {
        console.log(data);
        return <div>1234</div>;
      },
      btnList: [
        {
          type: 'primary',
          text: '新增',
          key: 'add',
          disabled: false, // 禁用状态
          icon: null, // antd icon组件
          loading: false, // 加载中
          onClick: () => {}, // 点击方法
        },
      ],
    },
  ];

  return (
    <CommonTableWithFilter
      name="parent"
      filterProps={filterProps}
      formProps={formProps}
      tableProps={tableProps}
      btnList={btnList}
      childTableProps={childTableProps}
    />
  );
};
```

### useMfgBtn、useMfgTab

通过 useMfgBtn、useMfgTab 获取按钮和 tab 按钮配置

```tsx
import React from 'react';
import { CommonTableWithFilter } from '@cccc/mes-base';
import type { ITableProps, IFilterFormProps, IChildTableProps } from '@cccc/mes-base/es/CommonTableWithFilter';
import { useMfgBtn, useMfgTab } from '@cccc/mes-utils/src/hooks/mfgBtnTagHooks';

export default () => {
  const [toolBtns, lineBtns] = useMfgBtn(
    'qms_quality_basic_sub',
    {
      add: {
        type: 'primary',
        onClick: () => {
          console.log('新增');
        },
      },
      batch: {
        disabled: true,
        onClick: () => {
          console.log('批量处理');
        },
      },
    },
    {
      edit: {
        // event: 'handleEdit', 当不设置event事件时，从配置中获取
        type: 'edit',
        btnCode: 'edit',
        iconConfig: {
          code: 'FullscreenExitOutlined',
        },
      },
      delete: {
        event: 'handleDelete',
        type: 'delete',
        btnCode: 'delete',
      },
    }
  );

  const [pageTabs] = useMfgTab(
    'bsm_sys_config_user_sys_user',
    {
      /** 管理租户 */
      bsm_sys_config_user_sys_user_grant_tenant: {
        add: {
          type: 'primary',
          onClick: () => {},
        },
      },
      /** 角色管理 */
      bsm_sys_config_user_sys_user_role: {
        add: {
          type: 'primary',
          onClick: () => {},
        },
      },
    },
    []
  );

  const tableProps: ITableProps = {
    tableInfo: {
      rowKey: 'id',
      selectType: 'radio',
      columnAlign: 'center',
      showSettingColumn: true,
      columnsList: [
        {
          columnName: '规则编码',
          columnNo: 'ruleCode',
          isEdit: ({ data }) => {
            return !data.id;
          },
          rules: [{ required: true, message: '规则编码必填' }],
          flex: 1,
        },
        {
          columnName: '规则名称',
          columnNo: 'ruleName',
          isEdit: true,
          rules: [{ required: true, message: '规则名称必填' }],
          flex: 1,
        },
      ],
      onSelectionChanged: (rows) => {
        console.log(rows, 123);
      },
    },
    cellSetting: {
      width: 60,
      actionList: lineBtns,
      actionEvent: {
        handleEdit: () => {
          console.log('行编辑');
        },
        handleDelete: () => {
          console.log('行删除');
        },
      },
    },
  };

  const formProps: IFilterFormProps = {
    fieldGroup: [
      {
        key: 'baseInfo',
        fields: [
          {
            label: '规则编码',
            name: 'ruleCode',
            type: 'Input',
          },
          {
            label: '规则名称',
            name: 'ruleName',
            type: 'Input',
          },
        ],
      },
    ],
    optionList: {},
    initialValues: {},
  };

  const filterProps = {
    searchApi: '/frontApi/qmsProd/admin/v1/level/transform/list',
  };

  const childTableProps: IChildTableProps[] = [
    {
      name: 'bsm_sys_config_user_sys_user_grant_tenant',
      tableProps: {
        title: '管理租户',
        tableInfo: {
          rowKey: 'id',
          columnsList: [
            {
              columnNo: 'tenancyNo',
              columnName: '租户编码',
              flex: 1,
            },
            {
              columnNo: 'tenantName',
              columnName: '租户名称',
              flex: 1,
            },
          ],
          showSettingColumn: true,
          defaultPageSize: 10,
        },
        cellSetting: {
          width: 60,
          actionList: pageTabs['bsm_sys_config_user_sys_user_grant_tenant']?.lineBtns || [],
          actionEvent: {
            handleDelete: (data: any) => {
              console.log('管理租户-行删除');
            },
          },
        },
      },
      filterProps: {
        searchApi: '/msys_apis/sys_user/manageTenant/query',
      },
      withFatherParams: {
        userId: 'id',
      },
    },
    {
      name: 'bsm_sys_config_user_sys_user_role',
      tableProps: {
        title: '角色管理',
        tableInfo: {
          rowKey: 'id',
          columnsList: [
            {
              columnNo: 'roleCode',
              columnName: '编码',
              flex: 1,
            },
            {
              columnNo: 'roleName',
              columnName: '名称',
              flex: 1,
            },
            {
              columnNo: 'roleType',
              columnName: '类型',
              flex: 1,
              columnType: 'Dict',
              dictCode: 'BSM_ROLE_ROLETYPE',
              dictType: 'mfgDict',
            },
            {
              columnNo: 'roleSource',
              columnName: '来源',
              flex: 1,
              columnType: 'Dict',
              dictCode: 'BSM_ROLE_ROLERELTYPE',
              dictType: 'mfgDict',
            },
          ],
          showSettingColumn: true,
        },
        hasPagination: false,
        defaultPageSize: 10,
        cellSetting: {
          width: 60,
          actionList: pageTabs['bsm_sys_config_user_sys_user_role']?.lineBtns || [],
          actionEvent: {
            handleDelete: (data: any) => {
              console.log('角色管理-行删除');
            },
          },
        },
      },
      filterProps: {
        searchApi: `/msys_apis/user/2c91d20c5615c055015615c53bb2003e/role`,
      },
      withFatherParams: {
        userId: 'id',
      },
    },
  ]
    .filter((item) => pageTabs[item.name])
    .map((pageTab) => ({
      ...pageTab,
      btnList: pageTabs[pageTab.name]?.toolBtns || [],
    }));

  return (
    <CommonTableWithFilter
      name="parent"
      filterProps={filterProps}
      formProps={formProps}
      tableProps={tableProps}
      btnList={toolBtns}
      childTableProps={childTableProps}
    />
  );
};
```

### API

| Name             | Description        | Type                                           | Default    |
| :--------------- | :----------------- | :--------------------------------------------- | :--------- |
| name             | 名称也是唯一的索引 | `string`                                       | `required` |
| tableProps       | 表格参数           | [ITableProps](/xioo-ag-table/single-table#api) | `required` |
| filterProps      | 过滤参数           | [IFilterProps](#IFilterProps)                  | `required` |
| formProps        | 表单参数           | [IFormProps](/xioo-form/common-form#api)       |
| btnList          | 按钮列表           | [IBaseBtn[]](/infrastructure/button-list#api)  |
| generateBtnList  | 自定义按钮         | `() => React.ReactElement`                     |
| filterRadioGroup | 额外的过滤按钮组   | `(RadioGroupProps & { key: string })[]`        |
| childTableProps  | 子表               | [IChildTableProps](#IChildTableProps)          |

#### IFilterProps

| Name              | Description    | Type     | Default |
| :---------------- | :------------- | :------- | :------ |
| searchApi         | 请求接口       | `string` |
| filterOtherParams | 请求的其他参数 | `object` |

#### IChildTableProps

| Name              | Description                                                             | Type           | Default |
| :---------------- | :---------------------------------------------------------------------- | :------------- | :------ |
| fatherRowKeyToApi | 是否将父的 rowKey 加到请求的 api 上                                     | `boolean`      | `fasle` |
| withFatherParams  | 额外带上的父的参数, key 是传给后端的 key， value 是父行要取的数据的 key | `[key]: value` |
